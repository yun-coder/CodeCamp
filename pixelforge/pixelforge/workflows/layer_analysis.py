"""Layer-analysis workflow — produces an ``ImageManifest`` from a project.

This is the pixelforge successor to ImageLayerAgent's
``LayerAnalyzer.analyze()``. It calls into the configured providers (OCR,
VLM, segmentation, human parser) and falls back to heuristic OpenCV
operations when a provider is not configured.

Output layers:

* ``background`` (locked)
* ``background_clean`` (inpainted background candidate)
* ``model_foreground`` (heuristic foreground)
* ``face_hair_candidate`` (top connected component)
* ``product_candidate`` (largest connected component)
* ``skin_occlusion_candidate`` (skin-tone pixels)
* ``shadow_candidate`` (soft shadow)
* ``product_clean`` (clothing minus skin)
* ``product_reconstruct`` (convex-hull reconstruction)
* ``upper_clothes`` / ``lower_clothes`` / ``dress`` / ``face_hair_parsed``
  / ``accessories`` (only if SCHP parser is configured)
* ``text_region_*`` (one per detected text region, after OCR pass)
"""
from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

from pixelforge.core.manifest_io import (
    bbox_from_mask,
    clean_background_asset,
    clothing_clean_asset,
    detect_text_regions,
    foreground_mask,
    product_candidate_mask,
    reconstruct_product,
    rectangular_asset,
    shadow_candidate_asset,
    skin_candidate_mask,
    top_subject_mask,
)
from pixelforge.core.models import (
    BBox,
    ImageLayer,
    ImageManifest,
    LayerAttributes,
    clamp_bbox,
)
from pixelforge.core.storage import ProjectStorage
from pixelforge.core.timing import run_with_timing
from pixelforge.providers.base import GroundedObject
from pixelforge.providers.registry import ProviderRegistry
from pixelforge.workflows.base import Workflow

logger = logging.getLogger(__name__)

ANALYZER_VERSION = "pixelforge-v0.1"


def _save_layer(storage, project_id, layer_id, rgba, mask=None):
    """Local wrapper for ProjectStorage.save_layer_assets.

    Keeps the body of the workflow tidy (4 args instead of 5). Returns
    ``(layer_relpath, mask_relpath_or_None)``.
    """
    return storage.save_layer_assets(project_id, layer_id, rgba, mask)


class LayerAnalysisWorkflow:
    """The pixelforge layer-analyzer workflow.

    Migrated from ImageLayerAgent's ``LayerAnalyzer``; the only public entry
    point is now :meth:`run`, which conforms to the ``Workflow`` Protocol.
    """

    name = "layer_analysis"

    def __init__(self, *, max_text_regions: int = 12) -> None:
        self.max_text_regions = max_text_regions

    def requires(self) -> list[str]:
        return ["ocr", "segmentation"]

    @run_with_timing("LayerAnalysisWorkflow.run")
    def run(
        self,
        storage: ProjectStorage,
        project_id: str,
        providers: ProviderRegistry,
        *,
        options: dict[str, object] | None = None,
    ) -> ImageManifest:
        project_dir = storage.require_project_dir(project_id)
        original_path = storage.original_path(project_id)
        image = Image.open(original_path).convert("RGB")
        width, height = image.size
        warnings: list[str] = []
        layers: list[ImageLayer] = []

        # 1) Background layer (always present, locked)
        bg_rel, _ = _save_layer(
            storage, project_id, "background", image.convert("RGBA"), None
        )
        layers.append(
            ImageLayer(
                id="background",
                name="Background",
                type="background",
                bbox=BBox(x=0, y=0, width=width, height=height),
                order=0,
                locked=True,
                asset_url=storage.asset_url(project_id, bg_rel),
                attributes=LayerAttributes(label="background", confidence=0.7),
            )
        )

        # 2) Foreground mask (heuristic GrabCut) + optional SAM refinement
        fg_mask, fg_warnings = foreground_mask(image)
        warnings.extend(fg_warnings)
        fg_bbox_seed = bbox_from_mask(fg_mask) or (0, 0, width, height)
        if providers.segmentation is not None:
            try:
                refined = providers.segmentation.segment(
                    image, [GroundedObject("model_foreground", fg_bbox_seed, 0.6, "model foreground")]
                )
                if "model_foreground" in refined:
                    fg_mask = Image.open(refined["model_foreground"].mask_path).convert("L")
                    warnings.append("SAM refined model_foreground mask.")
            except Exception as exc:
                warnings.append(f"SAM refinement of model_foreground failed: {exc}")

        # 3) Clean background candidate
        clean_bg, clean_bg_mask = clean_background_asset(image, fg_mask)
        clean_bg_rel, clean_bg_mask_rel = _save_layer(
            storage, project_id, "background_clean", clean_bg, clean_bg_mask
        )
        layers.append(
            ImageLayer(
                id="background_clean",
                name="Clean Background Candidate",
                type="background_clean",
                bbox=BBox(x=0, y=0, width=width, height=height),
                order=1,
                locked=True,
                asset_url=storage.asset_url(project_id, clean_bg_rel),
                mask_url=storage.asset_url(project_id, clean_bg_mask_rel) if clean_bg_mask_rel else None,
                attributes=LayerAttributes(
                    label="inpainted background candidate",
                    confidence=0.42,
                    notes="Approximate background repair. Replace with inpainting for production.",
                ),
            )
        )

        # 4) Foreground layer
        fg_bbox = bbox_from_mask(fg_mask) or fg_bbox_seed
        from pixelforge.core.manifest_io import rgba_asset
        fg_asset = rgba_asset(image, fg_mask, fg_bbox)
        fg_asset_rel, fg_mask_rel = _save_layer(storage, project_id, "model_foreground", fg_asset, fg_mask)
        layers.append(
            ImageLayer(
                id="model_foreground",
                name="Model / Main Foreground",
                type="human",
                bbox=BBox(x=fg_bbox[0], y=fg_bbox[1], width=fg_bbox[2], height=fg_bbox[3]),
                order=10,
                asset_url=storage.asset_url(project_id, fg_asset_rel),
                mask_url=storage.asset_url(project_id, fg_mask_rel) if fg_mask_rel else None,
                attributes=LayerAttributes(
                    label="model or main subject",
                    confidence=0.6,
                    notes="Heuristic foreground layer. Replace with SAM/person parser for production.",
                ),
            )
        )

        # 5) Head/face candidate
        head_mask, head_bbox = top_subject_mask(fg_mask)
        if providers.segmentation is not None and head_bbox is not None:
            try:
                refined = providers.segmentation.segment(
                    image, [GroundedObject("face_hair_candidate", head_bbox, 0.3, "face hair head")]
                )
                if "face_hair_candidate" in refined:
                    head_mask = Image.open(refined["face_hair_candidate"].mask_path).convert("L")
                    head_bbox = bbox_from_mask(head_mask)
                    warnings.append("SAM refined face_hair_candidate mask.")
            except Exception as exc:
                warnings.append(f"SAM refinement of face_hair_candidate failed: {exc}")
        if head_bbox is not None and head_bbox[2] * head_bbox[3] > width * height * 0.004:
            head_asset = rgba_asset(image, head_mask, head_bbox)
            head_asset_rel, head_mask_rel = _save_layer(
                storage, project_id, "face_hair_candidate", head_asset, head_mask
            )
            layers.append(
                ImageLayer(
                    id="face_hair_candidate",
                    name="Face / Hair Candidate",
                    type="face_hair",
                    bbox=BBox(x=head_bbox[0], y=head_bbox[1], width=head_bbox[2], height=head_bbox[3]),
                    order=25,
                    visible=False,
                    asset_url=storage.asset_url(project_id, head_asset_rel),
                    mask_url=storage.asset_url(project_id, head_mask_rel) if head_mask_rel else None,
                    attributes=LayerAttributes(
                        label="face or hair candidate",
                        confidence=0.3,
                        notes="Top connected component of the foreground.",
                    ),
                )
            )

        # 6) Product candidate
        product_mask, product_bbox = product_candidate_mask(fg_mask)
        if providers.segmentation is not None and product_bbox is not None:
            try:
                refined = providers.segmentation.segment(
                    image, [GroundedObject("product_candidate", product_bbox, 0.35, "product")]
                )
                if "product_candidate" in refined:
                    product_mask = Image.open(refined["product_candidate"].mask_path).convert("L")
                    product_bbox = bbox_from_mask(product_mask)
                    warnings.append("SAM refined product_candidate mask.")
            except Exception as exc:
                warnings.append(f"SAM refinement of product_candidate failed: {exc}")
        if product_bbox is not None and product_bbox[2] * product_bbox[3] > width * height * 0.015:
            product_asset = rgba_asset(image, product_mask, product_bbox)
            product_asset_rel, product_mask_rel = _save_layer(
                storage, project_id, "product_candidate", product_asset, product_mask
            )
            layers.append(
                ImageLayer(
                    id="product_candidate",
                    name="Product / Clothing Candidate",
                    type="product",
                    bbox=BBox(x=product_bbox[0], y=product_bbox[1], width=product_bbox[2], height=product_bbox[3]),
                    order=20,
                    visible=False,
                    asset_url=storage.asset_url(project_id, product_asset_rel),
                    mask_url=storage.asset_url(project_id, product_mask_rel) if product_mask_rel else None,
                    attributes=LayerAttributes(
                        label="clothing or product candidate",
                        confidence=0.35,
                        notes="Largest connected component of the foreground.",
                    ),
                )
            )
        else:
            warnings.append("Product candidate was too small or empty.")

        # 7) Skin/occlusion candidate
        skin_mask, skin_bbox = skin_candidate_mask(image, fg_mask)
        if providers.segmentation is not None and skin_bbox is not None:
            try:
                refined = providers.segmentation.segment(
                    image, [GroundedObject("skin_occlusion_candidate", skin_bbox, 0.28, "skin")]
                )
                if "skin_occlusion_candidate" in refined:
                    skin_mask = Image.open(refined["skin_occlusion_candidate"].mask_path).convert("L")
                    skin_bbox = bbox_from_mask(skin_mask)
                    warnings.append("SAM refined skin_occlusion_candidate mask.")
            except Exception as exc:
                warnings.append(f"SAM refinement of skin_occlusion_candidate failed: {exc}")
        if skin_bbox is not None and skin_bbox[2] * skin_bbox[3] > width * height * 0.003:
            skin_asset = rgba_asset(image, skin_mask, skin_bbox)
            skin_asset_rel, skin_mask_rel = _save_layer(
                storage, project_id, "skin_occlusion_candidate", skin_asset, skin_mask
            )
            layers.append(
                ImageLayer(
                    id="skin_occlusion_candidate",
                    name="Skin / Occlusion Candidate",
                    type="skin",
                    bbox=BBox(x=skin_bbox[0], y=skin_bbox[1], width=skin_bbox[2], height=skin_bbox[3]),
                    order=27,
                    visible=False,
                    asset_url=storage.asset_url(project_id, skin_asset_rel),
                    mask_url=storage.asset_url(project_id, skin_mask_rel) if skin_mask_rel else None,
                    attributes=LayerAttributes(
                        label="skin or hand/arm occlusion candidate",
                        confidence=0.28,
                        notes="Skin-tone pixels within the foreground.",
                    ),
                )
            )

        # 8) Shadow candidate
        shadow_asset, shadow_mask = shadow_candidate_asset((width, height), fg_mask)
        shadow_bbox = bbox_from_mask(shadow_mask)
        if shadow_bbox is not None:
            shadow_asset_rel, shadow_mask_rel = _save_layer(
                storage, project_id, "shadow_candidate", shadow_asset, shadow_mask
            )
            layers.append(
                ImageLayer(
                    id="shadow_candidate",
                    name="Soft Shadow Candidate",
                    type="shadow",
                    bbox=BBox(x=0, y=0, width=width, height=height),
                    order=5,
                    asset_url=storage.asset_url(project_id, shadow_asset_rel),
                    mask_url=storage.asset_url(project_id, shadow_mask_rel) if shadow_mask_rel else None,
                    attributes=LayerAttributes(
                        label="soft shadow candidate",
                        confidence=0.25,
                        notes="Synthetic editable shadow derived from foreground silhouette.",
                    ),
                )
            )

        # 9) product_clean (clothing minus skin)
        product_clean_layer_added = False
        if product_bbox is not None and skin_bbox is not None:
            clean_result = clothing_clean_asset(image, product_mask, skin_mask)
            if clean_result is not None:
                clean_asset, clean_mask = clean_result
                clean_rel, mask_rel = _save_layer(storage, project_id, "product_clean", clean_asset, clean_mask)
                clean_bbox = bbox_from_mask(clean_mask) or product_bbox
                layers.append(
                    ImageLayer(
                        id="product_clean",
                        name="干净服装产品 (去肤透明)",
                        type="product_clean",
                        bbox=BBox(x=clean_bbox[0], y=clean_bbox[1], width=clean_bbox[2], height=clean_bbox[3]),
                        order=21,
                        asset_url=storage.asset_url(project_id, clean_rel),
                        mask_url=storage.asset_url(project_id, mask_rel) if mask_rel else None,
                        attributes=LayerAttributes(
                            label="clean clothing product (skin removed)",
                            confidence=0.5,
                            notes="Product region with skin/occlusion subtracted.",
                        ),
                    )
                )
                warnings.append("product_clean: clothing with skin removed.")
                product_clean_layer_added = True
            else:
                warnings.append("product_clean: skin-removed region too small, skipped.")

        # 10) product_reconstruct via repair provider (or convex-hull fallback)
        if product_clean_layer_added and providers.repair is not None:
            clean_mask_path = project_dir / "masks" / "product_clean_mask.png"
            if clean_mask_path.exists():
                clean_mask_img = Image.open(clean_mask_path).convert("L")
                if providers.repair.name == "opencv_convex_hull":
                    recon = reconstruct_product(image, clean_mask_img)
                else:
                    recon = providers.repair.repair(image, clean_mask_img, "reconstruct product")
                if recon is not None:
                    recon_asset, recon_mask = recon
                    recon_rel, mask_rel = _save_layer(
                        storage, project_id, "product_reconstruct", recon_asset, recon_mask
                    )
                    recon_bbox = bbox_from_mask(recon_mask) or (0, 0, image.width, image.height)
                    layers.append(
                        ImageLayer(
                            id="product_reconstruct",
                            name="产品重建 (去人体穿着感)",
                            type="product_reconstruct",
                            bbox=BBox(x=recon_bbox[0], y=recon_bbox[1], width=recon_bbox[2], height=recon_bbox[3]),
                            order=22,
                            asset_url=storage.asset_url(project_id, recon_rel),
                            mask_url=storage.asset_url(project_id, mask_rel) if mask_rel else None,
                            attributes=LayerAttributes(
                                label="reconstructed product (no human silhouette)",
                                confidence=0.55,
                                notes="Reconstructed via configured repair provider.",
                            ),
                        )
                    )
                    warnings.append("product_reconstruct: generated by repair provider.")

        # 11) Human parsing (optional)
        if providers.human_parser is not None:
            parse = providers.human_parser.parse(image)
            if parse is not None:
                warnings.append(
                    f"Human parser ({providers.human_parser.backend}) returned "
                    f"{len(parse.grounded_objects())} body parts."
                )
                self._add_human_parse_layers(layers, parse, image, project_dir, project_id, storage)
            else:
                warnings.append(f"Human parser unavailable: {providers.human_parser.reason}")

        # 12) OCR text regions
        if providers.ocr is not None:
            text_boxes_raw = providers.ocr.read_text(image)
            warnings.append(f"OCR provider recognized {len(text_boxes_raw)} text line(s).")
            text_records: list[dict[str, object]] = []
            text_boxes: list[tuple[int, int, int, int, float, str | None]] = []
            visual_text_boxes = detect_text_regions(image)
            for tb in text_boxes_raw:
                x, y, w, h = tb.bbox
                text_boxes.append((x, y, w, h, tb.confidence, tb.text))
            for (x, y, w, h, score) in visual_text_boxes:
                text_boxes.append((x, y, w, h, score, None))
            # Suppress overlapping, take top-N
            selected: list[tuple[int, int, int, int, float, str | None]] = []
            for box in sorted(text_boxes, key=lambda b: b[4], reverse=True):
                x, y, w, h, _, _ = box
                overlaps = False
                for sx, sy, sw, sh, _, _ in selected:
                    ix1, iy1 = max(x, sx), max(y, sy)
                    ix2, iy2 = min(x + w, sx + sw), min(y + h, sy + sh)
                    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
                    if inter / max(1, min(w * h, sw * sh)) > 0.45:
                        overlaps = True
                        break
                if not overlaps:
                    selected.append(box)
                if len(selected) >= self.max_text_regions:
                    break
            for i, (x, y, w, h, score, recognized) in enumerate(selected, start=1):
                x, y, w, h = clamp_bbox(x, y, w, h, width, height)
                asset, text_mask = rectangular_asset(image, (x, y, w, h))
                layer_id = f"text_region_{i}"
                asset_rel, mask_rel = _save_layer(storage, project_id, layer_id, asset, text_mask)
                layers.append(
                    ImageLayer(
                        id=layer_id,
                        name=f"Text Region {i}",
                        type="text",
                        bbox=BBox(x=x, y=y, width=w, height=h),
                        order=30 + i,
                        asset_url=storage.asset_url(project_id, asset_rel),
                        mask_url=storage.asset_url(project_id, mask_rel) if mask_rel else None,
                        attributes=LayerAttributes(
                            label=recognized or "text-like visual region",
                            confidence=min(0.8, max(0.2, score)),
                            notes=(
                                f"OCR text: {recognized}" if recognized
                                else "Visual text candidate. OCR did not recognize."
                            ),
                            extra={"recognized_text": recognized} if recognized else {},
                        ),
                    )
                )
                text_records.append(
                    {
                        "id": layer_id,
                        "bbox": {"x": x, "y": y, "width": w, "height": h},
                        "recognized_text": recognized,
                        "confidence": min(0.8, max(0.2, score)),
                    }
                )
            if text_records:
                storage.save_json(project_id, "text_layers.json", text_records)
        else:
            warnings.append("OCR provider is not configured; PaddleOCR-guided layout anchors were skipped.")

        # 13) Finalize manifest
        type_counts: dict[str, int] = {}
        for layer in layers:
            type_counts[layer.type] = type_counts.get(layer.type, 0) + 1
        summary = (
            f"pixelforge layer parse produced {len(layers)} layers: "
            + ", ".join(f"{name}={count}" for name, count in sorted(type_counts.items()))
            + "."
        )
        manifest = ImageManifest(
            project_id=project_id,
            source_url=storage.asset_url(project_id, "original.png"),
            width=width,
            height=height,
            analyzer_version=ANALYZER_VERSION,
            summary=summary,
            stage="pixelforge-v0.1",
            layers=layers,
            warnings=warnings,
        )
        storage.save_manifest(project_id, manifest)
        storage.save_json(
            project_id,
            "analysis_report.json",
            {
                "project_id": project_id,
                "stage": manifest.stage,
                "summary": summary,
                "layer_count": len(layers),
                "type_counts": type_counts,
                "warnings": warnings,
                "next_model_integrations": [
                    "Human parser (SCHP) — wired as optional provider",
                    "VLM grounding — wired via minimax_vision",
                    "SAM — wired as optional refinement",
                    "PaddleOCR Cloud — wired as the OCR text provider",
                    "Inpainting/outpainting — wired as repair provider",
                ],
            },
        )
        return manifest

    # ── helpers ──────────────────────────────────────────────────
    def _add_human_parse_layers(
        self,
        layers: list[ImageLayer],
        parse,  # HumanParserOutput
        image: Image.Image,
        project_dir: Path,
        project_id: str,
        storage: ProjectStorage,
    ) -> None:
        from pixelforge.core.manifest_io import bbox_from_mask, rgba_asset
        from pixelforge.providers.parse.schp_human_parser import (
            ACCESSORY_CLASSES,
            BODY_CLASSES,
        )

        order_base = 20
        width, height = image.size
        for label, classes, layer_id, type_, visible in (
            ("upper_clothes", {4, 7}, "upper_clothes", "upper_clothes", True),
            ("lower_clothes", {5, 6}, "lower_clothes", "lower_clothes", True),
            ("dress", {7}, "dress", "dress", True),
            ("face_hair", BODY_CLASSES & {2, 11}, "face_hair_parsed", "face_hair", False),
            ("accessories", ACCESSORY_CLASSES, "accessories", "decor", False),
        ):
            mask = parse.mask_for_classes(classes)
            bbox = bbox_from_mask(mask)
            if bbox is None or bbox[2] * bbox[3] < width * height * 0.003:
                continue
            asset = rgba_asset(image, mask, bbox)
            layer_rel, mask_rel = _save_layer(storage, project_id, layer_id, asset, mask)
            layers.append(
                ImageLayer(
                    id=layer_id,
                    name=label.replace("_", " ").title(),
                    type=type_,
                    bbox=BBox(x=bbox[0], y=bbox[1], width=bbox[2], height=bbox[3]),
                    order=order_base,
                    visible=visible,
                    asset_url=storage.asset_url(project_id, layer_rel),
                    mask_url=storage.asset_url(project_id, mask_rel) if mask_rel else None,
                    attributes=LayerAttributes(
                        label=f"{label} (human parser)",
                        confidence=0.65,
                        notes="Body part segmentation via SCHP.",
                    ),
                )
            )
            order_base += 1


# Protocol self-check
_ = Workflow

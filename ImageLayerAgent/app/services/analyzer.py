from __future__ import annotations

from pathlib import Path

from PIL import Image

from app.models import BBox, ImageLayer, ImageManifest, LayerAttributes
from app.services.providers import GroundedObject, ProviderRegistry
from app.services.human_parser import (
    HumanParsingProvider,
    HumanParserOutput,
    CLOTHING_CLASSES,
    BODY_CLASSES,
    ACCESSORY_CLASSES,
    SCHP_LABEL_MAP,
)
from app.services.image_layers import (
    bbox_from_mask,
    clamp_bbox,
    clean_background_asset,
    clothing_clean_asset,
    detect_text_regions,
    foreground_mask,
    product_candidate_mask,
    reconstruct_product,
    rectangular_asset,
    rgba_asset,
    save_layer_files,
    shadow_candidate_asset,
    skin_candidate_mask,
    top_subject_mask,
)
from app.services.storage import ProjectStorage


ANALYZER_VERSION = "stage3-ecommerce-heuristic-0.3"


class LayerAnalyzer:
    def __init__(
        self,
        storage: ProjectStorage,
        providers: ProviderRegistry | None = None,
        human_parser: HumanParsingProvider | None = None,
    ) -> None:
        self.storage = storage
        self.providers = providers or ProviderRegistry()
        self.human_parser = human_parser

    def _refine_masks(
        self,
        image: Image.Image,
        objects: list[GroundedObject],
    ) -> dict[str, Image.Image]:
        if self.providers.segmentation is None or not objects:
            return {}
        return self.providers.segmentation.segment(image, objects)

    def _add_human_parse_layers(
        self,
        project_id: str,
        project_dir: Path,
        image: Image.Image,
        parse: HumanParserOutput,
        layers: list[ImageLayer],
        warnings: list[str],
    ) -> None:
        order_base = 20

        # merge upper_clothes + dress into one "upper" mask
        upper_mask = parse.mask_for_classes({4, 7})  # upper_clothes(4), dress(7)
        upper_bbox = bbox_from_mask(upper_mask)
        if upper_bbox is not None and upper_bbox[2] * upper_bbox[3] > image.width * image.height * 0.01:
            upper_asset = rgba_asset(image, upper_mask, upper_bbox)
            upper_rel, mask_rel = save_layer_files(project_dir, "upper_clothes", upper_asset, upper_mask)
            layers.append(
                ImageLayer(
                    id="upper_clothes",
                    name="上衣 / Upper Clothes",
                    type="upper_clothes",
                    bbox=BBox(x=upper_bbox[0], y=upper_bbox[1], width=upper_bbox[2], height=upper_bbox[3]),
                    order=order_base,
                    asset_url=self.storage.asset_url(project_id, upper_rel),
                    mask_url=self.storage.asset_url(project_id, mask_rel) if mask_rel else None,
                    attributes=LayerAttributes(
                        label="upper clothes (human parser)",
                        confidence=0.65,
                        notes="上衣区域，由人体解析模型提取。",
                    ),
                )
            )
            order_base += 1

        # lower: pants(6) + skirt(5)
        lower_mask = parse.mask_for_classes({5, 6})
        lower_bbox = bbox_from_mask(lower_mask)
        if lower_bbox is not None and lower_bbox[2] * lower_bbox[3] > image.width * image.height * 0.008:
            lower_asset = rgba_asset(image, lower_mask, lower_bbox)
            lower_rel, mask_rel = save_layer_files(project_dir, "lower_clothes", lower_asset, lower_mask)
            layers.append(
                ImageLayer(
                    id="lower_clothes",
                    name="下装 / Lower Clothes",
                    type="lower_clothes",
                    bbox=BBox(x=lower_bbox[0], y=lower_bbox[1], width=lower_bbox[2], height=lower_bbox[3]),
                    order=order_base,
                    asset_url=self.storage.asset_url(project_id, lower_rel),
                    mask_url=self.storage.asset_url(project_id, mask_rel) if mask_rel else None,
                    attributes=LayerAttributes(
                        label="lower clothes (human parser)",
                        confidence=0.65,
                        notes="下装区域（裤子/裙子），由人体解析模型提取。",
                    ),
                )
            )
            order_base += 1

        # dress as standalone (already included in upper, add separately if dress class present)
        dress_mask = parse.mask_for_class(7)
        dress_bbox = bbox_from_mask(dress_mask)
        if dress_bbox is not None and dress_bbox[2] * dress_bbox[3] > image.width * image.height * 0.015:
            dress_asset = rgba_asset(image, dress_mask, dress_bbox)
            dress_rel, mask_rel = save_layer_files(project_dir, "dress", dress_asset, dress_mask)
            layers.append(
                ImageLayer(
                    id="dress",
                    name="连衣裙 / Dress",
                    type="dress",
                    bbox=BBox(x=dress_bbox[0], y=dress_bbox[1], width=dress_bbox[2], height=dress_bbox[3]),
                    order=order_base,
                    asset_url=self.storage.asset_url(project_id, dress_rel),
                    mask_url=self.storage.asset_url(project_id, mask_rel) if mask_rel else None,
                    attributes=LayerAttributes(
                        label="dress (human parser)",
                        confidence=0.65,
                        notes="连衣裙区域，由人体解析模型提取。",
                    ),
                )
            )
            order_base += 1

        # face + hair as improved face_hair
        face_hair_mask = parse.mask_for_classes(BODY_CLASSES & {2, 11})  # hair(2), face(11)
        fh_bbox = bbox_from_mask(face_hair_mask)
        if fh_bbox is not None and fh_bbox[2] * fh_bbox[3] > image.width * image.height * 0.003:
            fh_asset = rgba_asset(image, face_hair_mask, fh_bbox)
            fh_rel, mask_rel = save_layer_files(project_dir, "face_hair_parsed", fh_asset, face_hair_mask)
            layers.append(
                ImageLayer(
                    id="face_hair_parsed",
                    name="面部/头发 (解析)",
                    type="face_hair",
                    bbox=BBox(x=fh_bbox[0], y=fh_bbox[1], width=fh_bbox[2], height=fh_bbox[3]),
                    order=25,
                    visible=False,
                    asset_url=self.storage.asset_url(project_id, fh_rel),
                    mask_url=self.storage.asset_url(project_id, mask_rel) if mask_rel else None,
                    attributes=LayerAttributes(
                        label="face / hair (human parser)",
                        confidence=0.55,
                        notes="面部和头发区域，由人体解析模型提取。",
                    ),
                )
            )

        # accessories: bag(16), hat(1), shoes(9,10), belt(8)
        acc_mask = parse.mask_for_classes(ACCESSORY_CLASSES)
        acc_bbox = bbox_from_mask(acc_mask)
        if acc_bbox is not None and acc_bbox[2] * acc_bbox[3] > image.width * image.height * 0.003:
            acc_asset = rgba_asset(image, acc_mask, acc_bbox)
            acc_rel, mask_rel = save_layer_files(project_dir, "accessories", acc_asset, acc_mask)
            layers.append(
                ImageLayer(
                    id="accessories",
                    name="配饰 / Accessories",
                    type="decor",
                    bbox=BBox(x=acc_bbox[0], y=acc_bbox[1], width=acc_bbox[2], height=acc_bbox[3]),
                    order=28,
                    visible=False,
                    asset_url=self.storage.asset_url(project_id, acc_rel),
                    mask_url=self.storage.asset_url(project_id, mask_rel) if mask_rel else None,
                    attributes=LayerAttributes(
                        label="accessories (human parser)",
                        confidence=0.4,
                        notes="配饰区域（包/帽子/鞋/腰带），由人体解析模型提取。",
                    ),
                )
            )

    def analyze(self, project_id: str) -> ImageManifest:
        project_dir = self.storage.require_project_dir(project_id)
        original_path = self.storage.original_path(project_id)
        image = Image.open(original_path).convert("RGB")
        width, height = image.size
        warnings: list[str] = []
        layers: list[ImageLayer] = []

        bg_asset_rel, _ = save_layer_files(
            project_dir,
            "background",
            image.convert("RGBA"),
            None,
        )
        layers.append(
            ImageLayer(
                id="background",
                name="Background",
                type="background",
                bbox=BBox(x=0, y=0, width=width, height=height),
                order=0,
                locked=True,
                asset_url=self.storage.asset_url(project_id, bg_asset_rel),
                attributes=LayerAttributes(label="background", confidence=0.7),
            )
        )

        fg_mask, fg_warnings = foreground_mask(image)
        warnings.extend(fg_warnings)
        fg_bbox_seed = bbox_from_mask(fg_mask) or (0, 0, width, height)
        refined = self._refine_masks(
            image,
            [
                GroundedObject("model_foreground", fg_bbox_seed, 0.6, "model foreground"),
            ],
        )
        if "model_foreground" in refined:
            fg_mask = refined["model_foreground"]
            warnings.append("SAM2 refined model_foreground mask.")

        clean_bg, clean_bg_mask = clean_background_asset(image, fg_mask)
        clean_bg_rel, clean_bg_mask_rel = save_layer_files(
            project_dir,
            "background_clean",
            clean_bg,
            clean_bg_mask,
        )
        layers.append(
            ImageLayer(
                id="background_clean",
                name="Clean Background Candidate",
                type="background_clean",
                bbox=BBox(x=0, y=0, width=width, height=height),
                order=1,
                locked=True,
                asset_url=self.storage.asset_url(project_id, clean_bg_rel),
                mask_url=self.storage.asset_url(project_id, clean_bg_mask_rel) if clean_bg_mask_rel else None,
                attributes=LayerAttributes(
                    label="inpainted background candidate",
                    confidence=0.42,
                    notes="Approximate background repair for layer movement. Replace with inpainting/outpainting for production.",
                ),
            )
        )

        fg_bbox = bbox_from_mask(fg_mask) or fg_bbox_seed
        fg_asset = rgba_asset(image, fg_mask, fg_bbox)
        fg_asset_rel, fg_mask_rel = save_layer_files(project_dir, "model_foreground", fg_asset, fg_mask)
        layers.append(
            ImageLayer(
                id="model_foreground",
                name="Model / Main Foreground",
                type="human",
                bbox=BBox(x=fg_bbox[0], y=fg_bbox[1], width=fg_bbox[2], height=fg_bbox[3]),
                order=10,
                asset_url=self.storage.asset_url(project_id, fg_asset_rel),
                mask_url=self.storage.asset_url(project_id, fg_mask_rel) if fg_mask_rel else None,
                attributes=LayerAttributes(
                    label="model or main subject",
                    confidence=0.6,
                    notes="Heuristic foreground layer. Replace with SAM2/person parser for production.",
                ),
            )
        )

        head_mask, head_bbox = top_subject_mask(fg_mask)
        if head_bbox is not None:
            refined = self._refine_masks(
                image,
                [GroundedObject("face_hair_candidate", head_bbox, 0.3, "face hair head")],
            )
            if "face_hair_candidate" in refined:
                head_mask = refined["face_hair_candidate"]
                head_bbox = bbox_from_mask(head_mask)
                warnings.append("SAM2 refined face_hair_candidate mask.")
        if head_bbox is not None and head_bbox[2] * head_bbox[3] > width * height * 0.004:
            head_asset = rgba_asset(image, head_mask, head_bbox)
            head_asset_rel, head_mask_rel = save_layer_files(project_dir, "face_hair_candidate", head_asset, head_mask)
            layers.append(
                ImageLayer(
                    id="face_hair_candidate",
                    name="Face / Hair Candidate",
                    type="face_hair",
                    bbox=BBox(x=head_bbox[0], y=head_bbox[1], width=head_bbox[2], height=head_bbox[3]),
                    order=25,
                    visible=False,
                    asset_url=self.storage.asset_url(project_id, head_asset_rel),
                    mask_url=self.storage.asset_url(project_id, head_mask_rel) if head_mask_rel else None,
                    attributes=LayerAttributes(
                        label="face or hair candidate",
                        confidence=0.3,
                        notes="Approximate top-foreground layer for occlusion reasoning.",
                    ),
                )
            )

        product_mask, product_bbox = product_candidate_mask(fg_mask)
        if product_bbox is not None:
            refined = self._refine_masks(
                image,
                [GroundedObject("product_candidate", product_bbox, 0.35, "clothing product garment")],
            )
            if "product_candidate" in refined:
                product_mask = refined["product_candidate"]
                product_bbox = bbox_from_mask(product_mask)
                warnings.append("SAM2 refined product_candidate mask.")
        if product_bbox is not None and product_bbox[2] * product_bbox[3] > width * height * 0.015:
            product_asset = rgba_asset(image, product_mask, product_bbox)
            product_asset_rel, product_mask_rel = save_layer_files(
                project_dir, "product_candidate", product_asset, product_mask
            )
            layers.append(
                ImageLayer(
                    id="product_candidate",
                    name="Product / Clothing Candidate",
                    type="product",
                    bbox=BBox(
                        x=product_bbox[0],
                        y=product_bbox[1],
                        width=product_bbox[2],
                        height=product_bbox[3],
                    ),
                    order=20,
                    visible=False,
                    asset_url=self.storage.asset_url(project_id, product_asset_rel),
                    mask_url=self.storage.asset_url(project_id, product_mask_rel) if product_mask_rel else None,
                    attributes=LayerAttributes(
                        label="clothing or product candidate",
                        confidence=0.35,
                        notes="Approximate ecommerce product region based on foreground geometry.",
                    ),
                )
            )
        else:
            warnings.append("Product candidate was too small or empty.")

        skin_mask, skin_bbox = skin_candidate_mask(image, fg_mask)
        if skin_bbox is not None:
            refined = self._refine_masks(
                image,
                [GroundedObject("skin_occlusion_candidate", skin_bbox, 0.28, "skin hands arms occlusion")],
            )
            if "skin_occlusion_candidate" in refined:
                skin_mask = refined["skin_occlusion_candidate"]
                skin_bbox = bbox_from_mask(skin_mask)
                warnings.append("SAM2 refined skin_occlusion_candidate mask.")
        if skin_bbox is not None and skin_bbox[2] * skin_bbox[3] > width * height * 0.003:
            skin_asset = rgba_asset(image, skin_mask, skin_bbox)
            skin_asset_rel, skin_mask_rel = save_layer_files(
                project_dir, "skin_occlusion_candidate", skin_asset, skin_mask
            )
            layers.append(
                ImageLayer(
                    id="skin_occlusion_candidate",
                    name="Skin / Occlusion Candidate",
                    type="skin",
                    bbox=BBox(x=skin_bbox[0], y=skin_bbox[1], width=skin_bbox[2], height=skin_bbox[3]),
                    order=27,
                    visible=False,
                    asset_url=self.storage.asset_url(project_id, skin_asset_rel),
                    mask_url=self.storage.asset_url(project_id, skin_mask_rel) if skin_mask_rel else None,
                    attributes=LayerAttributes(
                        label="skin or hand/arm occlusion candidate",
                        confidence=0.28,
                        notes="Useful when product clothing is partly covered by arms, hands, or face.",
                    ),
                )
            )
        else:
            warnings.append("Skin/occlusion candidate was too small or empty.")

        shadow_asset, shadow_mask = shadow_candidate_asset((width, height), fg_mask)
        shadow_bbox = bbox_from_mask(shadow_mask)
        if shadow_bbox is not None:
            shadow_asset_rel, shadow_mask_rel = save_layer_files(project_dir, "shadow_candidate", shadow_asset, shadow_mask)
            layers.append(
                ImageLayer(
                    id="shadow_candidate",
                    name="Soft Shadow Candidate",
                    type="shadow",
                    bbox=BBox(x=0, y=0, width=width, height=height),
                    order=5,
                    visible=True,
                    asset_url=self.storage.asset_url(project_id, shadow_asset_rel),
                    mask_url=self.storage.asset_url(project_id, shadow_mask_rel) if shadow_mask_rel else None,
                    attributes=LayerAttributes(
                        label="soft shadow candidate",
                        confidence=0.25,
                        notes="Synthetic editable shadow derived from foreground silhouette.",
                    ),
                )
            )

        product_clean_layer_added = False

        # --- product clean: clothing minus skin occlusion = transparent clothing PNG ---
        if product_bbox is not None and skin_bbox is not None:
            clean_result = clothing_clean_asset(image, product_mask, skin_mask)
            if clean_result is not None:
                clean_asset, clean_mask = clean_result
                clean_rel, mask_rel = save_layer_files(project_dir, "product_clean", clean_asset, clean_mask)
                clean_bbox = bbox_from_mask(clean_mask) or product_bbox
                layers.append(
                    ImageLayer(
                        id="product_clean",
                        name="干净服装产品 (去肤透明)",
                        type="product_clean",
                        bbox=BBox(
                            x=clean_bbox[0], y=clean_bbox[1],
                            width=clean_bbox[2], height=clean_bbox[3],
                        ),
                        order=21,
                        visible=True,
                        asset_url=self.storage.asset_url(project_id, clean_rel),
                        mask_url=self.storage.asset_url(project_id, mask_rel) if mask_rel else None,
                        attributes=LayerAttributes(
                            label="clean clothing product (skin removed)",
                            confidence=0.5,
                            notes="从 product_candidate 中剔除 skin_occlusion 区域得到的干净服装产品透明图。",
                        ),
                    )
                )
                warnings.append("product_clean: clothing product with skin removed, transparent background.")
                product_clean_layer_added = True
            else:
                warnings.append("product_clean: skin-removed clothing region too small, skipped.")
        else:
            warnings.append("product_clean: missing product or skin mask, skipped.")

        # --- product reconstruct: remove human-wearing silhouette ---
        if product_clean_layer_added:
            clean_mask_path = project_dir / "masks" / "product_clean_mask.png"
            if clean_mask_path.exists():
                clean_mask_img = Image.open(clean_mask_path).convert("L")
                recon_result = reconstruct_product(image, clean_mask_img)
                if recon_result is not None:
                    recon_asset, recon_mask = recon_result
                    recon_rel, mask_rel = save_layer_files(project_dir, "product_reconstruct", recon_asset, recon_mask)
                    recon_bbox = bbox_from_mask(recon_mask) or (0, 0, image.width, image.height)
                    layers.append(
                        ImageLayer(
                            id="product_reconstruct",
                            name="产品重建 (去人体穿着感)",
                            type="product_reconstruct",
                            bbox=BBox(
                                x=recon_bbox[0], y=recon_bbox[1],
                                width=recon_bbox[2], height=recon_bbox[3],
                            ),
                            order=22,
                            visible=True,
                            asset_url=self.storage.asset_url(project_id, recon_rel),
                            mask_url=self.storage.asset_url(project_id, mask_rel) if mask_rel else None,
                            attributes=LayerAttributes(
                                label="reconstructed product (no human silhouette)",
                                confidence=0.55,
                                notes="凸包补全 + 形态学清理：填充人体遮挡缺口，弱化穿着轮廓。可作为电商透明商品图直接使用。",
                            ),
                        )
                    )
                    warnings.append("product_reconstruct: dehumanized product silhouette via convex hull + morph cleanup.")
                else:
                    warnings.append("product_reconstruct: reconstruction result too small, skipped.")
            else:
                warnings.append("product_reconstruct: product_clean mask file missing, skipped.")

        # --- human parsing: clothing & body part segmentation ---
        human_parse: HumanParserOutput | None = None
        if self.human_parser is not None and self.human_parser.available:
            human_parse = self.human_parser.parse(image)
            if human_parse is not None:
                warnings.append(
                    f"Human parser ({self.human_parser.backend}) segmented "
                    f"{len(human_parse.grounded_objects())} body/clothing parts."
                )
                self._add_human_parse_layers(project_id, project_dir, image, human_parse, layers, warnings)
            else:
                warnings.append(f"Human parser available but parse returned None: {self.human_parser.reason}")

        ocr_objects = self.providers.ocr.read_text(image) if self.providers.ocr is not None else []
        if self.providers.ocr is not None:
            warnings.append(f"OCR provider recognized {len(ocr_objects)} text line(s).")
        else:
            warnings.append("OCR provider is not configured; PaddleOCR-guided layout anchors were skipped.")

        text_records = []
        text_boxes: list[tuple[int, int, int, int, float, str | None]] = []
        visual_text_boxes = detect_text_regions(image)
        markdown_fallback_texts: list[str] = []
        for obj in ocr_objects:
            x, y, bw, bh = obj.bbox
            if visual_text_boxes and self._looks_like_markdown_text_fallback((x, y, bw, bh), width, height):
                markdown_fallback_texts.append(obj.label)
                continue
            text_boxes.append((x, y, bw, bh, obj.confidence, obj.label))
        for index, (x, y, bw, bh, score) in enumerate(visual_text_boxes):
            recognized_text = markdown_fallback_texts[0] if index == 0 and markdown_fallback_texts else None
            text_boxes.append((x, y, bw, bh, score, recognized_text))

        selected_text_boxes: list[tuple[int, int, int, int, float, str | None]] = []
        for box in sorted(text_boxes, key=lambda item: item[4], reverse=True):
            x, y, bw, bh, _, _ = box
            overlaps = False
            for sx, sy, sw, sh, _, _ in selected_text_boxes:
                ix1, iy1 = max(x, sx), max(y, sy)
                ix2, iy2 = min(x + bw, sx + sw), min(y + bh, sy + sh)
                inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
                if inter / max(1, min(bw * bh, sw * sh)) > 0.45:
                    overlaps = True
                    break
            if not overlaps:
                selected_text_boxes.append(box)
            if len(selected_text_boxes) >= 12:
                break

        for index, (x, y, bw, bh, score, recognized_text) in enumerate(selected_text_boxes, start=1):
            x, y, bw, bh = clamp_bbox(x, y, bw, bh, width, height)
            asset, text_mask = rectangular_asset(image, (x, y, bw, bh))
            layer_id = f"text_region_{index}"
            asset_rel, mask_rel = save_layer_files(project_dir, layer_id, asset, text_mask)
            layers.append(
                ImageLayer(
                    id=layer_id,
                    name=f"Visual Text Region {index}",
                    type="text",
                    bbox=BBox(x=x, y=y, width=bw, height=bh),
                    order=30 + index,
                    asset_url=self.storage.asset_url(project_id, asset_rel),
                    mask_url=self.storage.asset_url(project_id, mask_rel) if mask_rel else None,
                    attributes=LayerAttributes(
                        label=recognized_text or "text-like visual region",
                        confidence=min(0.8, max(0.2, score)),
                        notes=(
                            f"OCR text: {recognized_text}"
                            if recognized_text
                            else "Visual text candidate. OCR did not recognize text for this region."
                        ),
                        extra={"recognized_text": recognized_text},
                    ),
                )
            )
            text_records.append(
                {
                    "id": layer_id,
                    "bbox": {"x": x, "y": y, "width": bw, "height": bh},
                    "recognized_text": recognized_text,
                    "confidence": min(0.8, max(0.2, score)),
                    "notes": "OCR recognized text." if recognized_text else "Visual text-region candidate.",
                }
            )

        if not any(layer.type == "text" for layer in layers):
            warnings.append("No text-like regions detected by the heuristic analyzer.")

        type_counts: dict[str, int] = {}
        for layer in layers:
            type_counts[layer.type] = type_counts.get(layer.type, 0) + 1

        summary = (
            f"Stage 3 ecommerce layer parse produced {len(layers)} layers: "
            + ", ".join(f"{name}={count}" for name, count in sorted(type_counts.items()))
            + "."
        )

        manifest = ImageManifest(
            project_id=project_id,
            source_url=self.storage.asset_url(project_id, "original.png"),
            width=width,
            height=height,
            analyzer_version=ANALYZER_VERSION,
            summary=summary,
            layers=layers,
            warnings=warnings,
        )
        self.storage.save_manifest(manifest)
        self.storage.save_json(project_id, "text_layers.json", text_records)
        self.storage.save_json(
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
                    "Human parser (SCHP) for clothing/body segmentation — wired as optional provider",
                    "VLM grounding for precise product/model/text boxes",
                    "SAM2 is wired as an optional mask refiner when configured",
                    "PaddleOCR Cloud API is wired as the OCR text provider when configured",
                    "Inpainting/outpainting provider for commercial-grade background repair",
                ],
            },
        )
        return manifest

    def _looks_like_markdown_text_fallback(self, bbox: tuple[int, int, int, int], width: int, height: int) -> bool:
        x, y, bw, bh = bbox
        return (
            x <= max(28, int(width * 0.05))
            and y <= max(120, int(height * 0.18))
            and bw >= width * 0.82
            and bh <= height * 0.12
        )

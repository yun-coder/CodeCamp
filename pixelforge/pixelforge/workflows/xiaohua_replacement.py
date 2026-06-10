"""Xiaohua replacement workflow — e-commerce product/person replacement.

Pixelforge successor to ``XiaohuaReplacementWorkflow`` in ImageLayerAgent.

Steps:

1. Run (or load) ``LayerAnalysisWorkflow`` to get an ``ImageManifest``.
2. Build an ``image_edit_mask`` from the manifest's foreground and the
   ``vision_plan.protected_regions``.
3. Call the configured ``ImageEditProvider`` to harmonize the result.
4. Re-cover OCR text on top of the result.
5. Persist ``ReplacementManifest`` and the final PNG.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

from PIL import Image, ImageChops, ImageDraw, ImageFilter

from pixelforge.core.manifest_io import (
    erase_masked_background_region,
    rendered_text_overlay_asset,
)
from pixelforge.core.models import (
    BBox,
    ImageManifest,
    ReplacementManifest,
    ReplacementTargetRegion,
)
from pixelforge.core.storage import ProjectStorage
from pixelforge.core.timing import run_with_timing
from pixelforge.providers.registry import ProviderRegistry
from pixelforge.workflows.base import Workflow

logger = logging.getLogger(__name__)


def _save_layer(storage, project_id, layer_id, rgba, mask=None):
    return storage.save_layer_assets(project_id, layer_id, rgba, mask)


@dataclass(frozen=True)
class _TargetCandidate:
    id: str
    label: str
    bbox: tuple[int, int, int, int]
    source: str = "vision_plan"
    mask_url: str | None = None


class XiaohuaReplacementWorkflow:
    """The pixelforge e-commerce replacement workflow.

    Takes an analyzed project (with both ``original.png`` and ``product.png``)
    and produces a ``ReplacementManifest`` + final composition PNG.
    """

    name = "xiaohua_replacement"

    def requires(self) -> list[str]:
        return ["ocr", "grounding", "edit"]

    @run_with_timing("XiaohuaReplacementWorkflow.run")
    def run(
        self,
        storage: ProjectStorage,
        project_id: str,
        providers: ProviderRegistry,
        *,
        options: dict[str, object] | None = None,
    ) -> ReplacementManifest:
        opts = options or {}
        compose = bool(opts.get("compose", True))
        force_replan = bool(opts.get("force_replan", False))

        project_dir = storage.require_project_dir(project_id)
        product_path = storage.product_path(project_id)
        if not product_path.exists():
            raise FileNotFoundError("product.png is required for the replacement workflow")

        warnings: list[str] = []
        try:
            manifest = storage.load_manifest(project_id)
        except FileNotFoundError:
            raise RuntimeError(
                "No manifest found. Run the layer_analysis workflow first."
            )
        if not self._has_ocr_pass(manifest):
            if providers.ocr is None:
                raise RuntimeError(
                    "PaddleOCR is required for the replacement workflow. "
                    "Please configure PADDLEOCR_ACCESS_TOKEN."
                )
            raise RuntimeError(
                "Manifest is missing an OCR pass. Re-run layer_analysis with an OCR provider."
            )
        warnings.append("已使用 PaddleOCR 识别结果作为版式锚点和文案保护输入。")

        original = Image.open(storage.original_path(project_id)).convert("RGBA")
        product = Image.open(product_path).convert("RGBA")
        plan = self._build_plan(providers, original, product, manifest, warnings)
        targets = [
            _TargetCandidate(id=t.id, label=t.label, bbox=t.bbox)
            for t in plan.targets
        ]

        result_url: str | None = None
        foreground_overlay_url: str | None = None
        if compose:
            if providers.edit is None:
                raise RuntimeError(
                    "Image edit provider is not configured. Set IMAGE_EDIT_PROVIDER or "
                    "OPENAI_IMAGE_EDIT_ENABLED=1."
                    "Set MINIMAX_IMAGE_EDIT_ENABLED=1 to enable."
                )
            edit_mask = self._image_edit_mask(storage, manifest, plan, targets, original.size)
            edit_result = providers.edit.edit_product_replacement(
                original=original,
                reference=product,
                mask=edit_mask,
                prompt=self._model_edit_prompt(plan, manifest),
                work_dir=project_dir / "compositions",
            )
            if edit_result is None:
                raise RuntimeError(
                    f"Image edit provider returned no result: {providers.edit.reason}"
                )
            result = edit_result.convert("RGBA")
            (project_dir / "compositions").mkdir(parents=True, exist_ok=True)
            result.save(project_dir / "compositions" / "model_replacement_raw.png")
            warnings.append("已使用图像编辑模型生成替换结果，本地不再执行主体抠图或贴图合成。")

            text_overlay = self._text_overlay(original, manifest)
            if text_overlay is not None:
                foreground_overlay, overlay_mask = text_overlay
                result = self._erase_text_layer_regions(storage, result, manifest, project_dir)
                result = erase_masked_background_region(result, overlay_mask)
                result.alpha_composite(foreground_overlay.convert("RGBA"), (0, 0))
                overlay_rel, _ = _save_layer(
                    storage, project_id, "replacement_foreground_overlay", foreground_overlay, overlay_mask
                )
                foreground_overlay_url = storage.asset_url(project_id, overlay_rel)
                warnings.append("已根据 PaddleOCR 文案在最终合成最后生成文字层，避免人物覆盖文字。")

            result.save(project_dir / "compositions" / "replacement_result.png")
            result_url = storage.asset_url(project_id, "compositions", "replacement_result.png")

        if not targets:
            warnings.append("No replacement targets identified by the vision planner.")
            primary_bbox: tuple[int, int, int, int] = (0, 0, original.width, original.height)
        else:
            primary_bbox = targets[0].bbox

        replacement = ReplacementManifest(
            project_id=project_id,
            scene_url=storage.asset_url(project_id, "original.png"),
            product_url=storage.asset_url(project_id, "product.png"),
            background_clean_url=None,
            target_bbox=BBox(
                x=primary_bbox[0], y=primary_bbox[1],
                width=primary_bbox[2], height=primary_bbox[3],
            ),
            target_mask_url=None,
            target_regions=[
                ReplacementTargetRegion(
                    id=t.id,
                    label=t.label,
                    bbox=BBox(x=t.bbox[0], y=t.bbox[1], width=t.bbox[2], height=t.bbox[3]),
                    source=t.source,
                    mask_url=t.mask_url,
                )
                for t in targets
            ],
            product_cutout_url=None,
            foreground_overlay_url=foreground_overlay_url,
            model_plan_url=storage.asset_url(project_id, "model_plan.json"),
            result_url=result_url,
            style_summary=f"{plan.scene_summary} {plan.subject_summary}".strip(),
            warnings=warnings + manifest.warnings,
        )
        storage.save_replacement(replacement)
        return replacement

    # ── helpers ──────────────────────────────────────────────────
    def _build_plan(self, providers, original, product, manifest, warnings):
        if providers.grounding is None:
            raise RuntimeError(
                "Vision planner (grounding) is not configured. "
                "Set MINIMAX_API_KEY + MINIMAX_VISION_PLAN_ENABLED=1 to enable."
            )
        plan = providers.grounding.plan_replacement(
            original, product, ocr_text=self._ocr_text(manifest)
        )
        warnings.append(f"已使用视觉规划模型生成替换计划：{providers.grounding.reason}。")
        return plan

    def _image_edit_mask(self, storage, manifest, plan, targets, size):
        width, height = size
        mask = Image.new("L", size, 0)
        draw = ImageDraw.Draw(mask)
        for target in targets:
            x, y, w, h = target.bbox
            pad_x = max(18, int(w * 0.12))
            pad_top = max(18, int(h * 0.10))
            pad_bottom = max(18, int(h * 0.08))
            draw.rounded_rectangle(
                (
                    max(0, x - pad_x),
                    max(0, y - pad_top),
                    min(width, x + w + pad_x),
                    min(height, y + h + pad_bottom),
                ),
                radius=max(18, min(w, h) // 12),
                fill=255,
            )

        for layer in manifest.layers:
            if layer.type != "text" or not layer.mask_url:
                continue
            text_path = storage.resolve_asset(manifest.project_id, *layer.mask_url.split("/")[-2:])
            if text_path.exists():
                text_mask = Image.open(text_path).resize(size).convert("L").filter(ImageFilter.MaxFilter(25))
                mask = ImageChops.subtract(mask, text_mask)

        protected = Image.new("L", size, 0)
        protected_draw = ImageDraw.Draw(protected)
        for region in plan.protected_regions:
            x, y, w, h = region.bbox
            pad = max(4, min(w, h) // 10)
            protected_draw.rounded_rectangle(
                (
                    max(0, x - pad),
                    max(0, y - pad),
                    min(width, x + w + pad),
                    min(height, y + h + pad),
                ),
                radius=max(4, min(w, h) // 8),
                fill=255,
            )
        if protected.getbbox() is not None:
            protected = protected.filter(ImageFilter.MaxFilter(9))
            mask = ImageChops.subtract(mask, protected)

        return mask.filter(ImageFilter.GaussianBlur(radius=1.5))

    def _model_edit_prompt(self, plan, manifest) -> str:
        protected_text = ";".join(plan.preserve_text) or (self._ocr_text(manifest) or "")
        target_lines = [f"- {t.label}: bbox={t.bbox}, rationale={t.rationale}" for t in plan.targets]
        protected_lines = [f"- {r.label}: bbox={r.bbox}, reason={r.reason}" for r in plan.protected_regions]
        return (
            "你正在生成一张中文电商海报的产品/人物替换结果。"
            "第一张输入图是原图，第二张输入图是新产品参考图。"
            "必须保留原图背景风格、圆角画框、构图、光线、阴影、文案层级和商业海报质感。"
            "只在 mask 覆盖的目标区域内完成替换，把参考图中的人物、服装、鞋包、手表、首饰等作为完整商品主体融合进去。"
            "不要生成灰色补丁、断头、断脖子、硬边、重复肢体、模糊脚部或贴图痕迹。"
            "不要改写、遮挡、移动或重排原图文案；最终系统会在最上层重新覆盖 OCR 文案。"
            f"\n\n视觉规划：{plan.scene_summary}\n产品主体：{plan.subject_summary}"
            f"\n目标区域：\n{chr(10).join(target_lines)}"
            f"\n不可编辑/需保护区域：\n{chr(10).join(protected_lines) if protected_lines else '无'}"
            f"\n需要保护的 OCR 文案：{protected_text}"
            f"\n补充编辑要求：{plan.edit_prompt}"
        )

    def _text_overlay(self, original, manifest):
        text = self._ocr_text(manifest)
        if not text:
            return None
        return rendered_text_overlay_asset(original.convert("RGB"), text)

    def _erase_text_layer_regions(self, storage, image, manifest, project_dir):
        cleaned = image.convert("RGBA")
        for layer in manifest.layers:
            if layer.type != "text" or not layer.mask_url:
                continue
            try:
                mask_path = storage.resolve_asset(manifest.project_id, *layer.mask_url.split("/")[-2:])
            except ValueError:
                continue
            if mask_path.exists():
                cleaned = erase_masked_background_region(cleaned, Image.open(mask_path).convert("L"))
        return cleaned

    def _ocr_text(self, manifest) -> str | None:
        texts: list[str] = []
        for layer in manifest.layers:
            if layer.type != "text":
                continue
            text = layer.attributes.extra.get("recognized_text") if layer.attributes else None
            if isinstance(text, str) and text.strip():
                texts.append(text.strip())
        return " ".join(texts) if texts else None

    def _has_ocr_pass(self, manifest) -> bool:
        if any("OCR provider recognized" in w for w in manifest.warnings):
            return True
        return any(
            layer.type == "text"
            and isinstance(layer.attributes.extra.get("recognized_text"), str)
            and bool(layer.attributes.extra.get("recognized_text"))
            for layer in manifest.layers
        )


# Protocol self-check
_ = Workflow

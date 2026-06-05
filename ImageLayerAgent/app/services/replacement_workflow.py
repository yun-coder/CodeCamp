from __future__ import annotations

from dataclasses import dataclass

from PIL import Image, ImageChops, ImageDraw, ImageFilter

from app.models import BBox, ImageManifest, ReplacementManifest, ReplacementTargetRegion, ThirdPartySettings
from app.services.image_editing import build_image_edit_provider
from app.services.image_layers import erase_masked_background_region, rendered_text_overlay_asset, save_layer_files
from app.services.storage import ProjectStorage
from app.services.vision_planner import OpenAIVisionPlanner, ReplacementPlan


@dataclass(frozen=True)
class _TargetCandidate:
    id: str
    label: str
    bbox: tuple[int, int, int, int]
    source: str = "openai_vision_plan"
    mask_url: str | None = None


class XiaohuaReplacementWorkflow:
    """Model-first OCR-guided product/person replacement workflow."""

    def __init__(self, storage: ProjectStorage) -> None:
        self.storage = storage

    def build(
        self,
        project_id: str,
        manifest: ImageManifest,
        compose: bool,
        settings: ThirdPartySettings | None = None,
    ) -> ReplacementManifest:
        if settings is None:
            raise RuntimeError("模型工作流需要第三方模型设置，请先配置 OpenAI API Key/Base URL。")

        project_dir = self.storage.require_project_dir(project_id)
        product_path = self.storage.product_path(project_id)
        if not product_path.exists():
            raise FileNotFoundError("product.png")

        warnings: list[str] = []
        if self._has_paddleocr_pass(manifest):
            warnings.append("已使用 PaddleOCR 识别结果作为版式锚点和文案保护输入。")
        else:
            warnings.append("当前 manifest 没有 PaddleOCR 识别记录，请先配置 PaddleOCR 并重新分析原图。")

        original = Image.open(self.storage.original_path(project_id)).convert("RGBA")
        product = Image.open(product_path).convert("RGBA")
        plan = self._build_model_plan(project_id, manifest, settings, warnings)
        targets = [
            _TargetCandidate(id=target.id, label=target.label, bbox=target.bbox)
            for target in plan.targets
        ]

        result_url = None
        foreground_overlay_url = None
        if compose:
            edit_provider = build_image_edit_provider(settings)
            if not edit_provider.available:
                raise RuntimeError(f"图像编辑模型不可用：{edit_provider.reason}")

            edit_mask = self._image_edit_mask(manifest, plan, targets, original.size)
            edit_result = edit_provider.edit_product_replacement(
                original,
                product,
                edit_mask,
                self._model_edit_prompt(plan, manifest),
                project_dir / "compositions",
            )
            if edit_result is None:
                raise RuntimeError(f"图像编辑模型未返回结果：{edit_provider.reason}")

            result = edit_result.image.convert("RGBA")
            (project_dir / "compositions" / "model_replacement_raw.png").parent.mkdir(parents=True, exist_ok=True)
            result.save(project_dir / "compositions" / "model_replacement_raw.png")
            warnings.append("已使用图像编辑模型生成替换结果，本地不再执行主体抠图或贴图合成。")

            text_overlay = self._text_overlay(original, manifest)
            if text_overlay is not None:
                foreground_overlay, overlay_mask = text_overlay
                result = self._erase_text_layer_regions(result, manifest, project_dir)
                result = erase_masked_background_region(result, overlay_mask)
                result.alpha_composite(foreground_overlay.convert("RGBA"), (0, 0))
                overlay_rel, _ = save_layer_files(project_dir, "replacement_foreground_overlay", foreground_overlay, overlay_mask)
                foreground_overlay_url = self.storage.asset_url(project_id, overlay_rel)
                warnings.append("已根据 PaddleOCR 文案在最终合成最后生成文字层，避免人物覆盖文字。")

            result.save(project_dir / "compositions" / "replacement_result.png")
            result_url = self.storage.asset_url(project_id, "compositions", "replacement_result.png")

        primary = targets[0]
        replacement = ReplacementManifest(
            project_id=project_id,
            scene_url=self.storage.asset_url(project_id, "original.png"),
            product_url=self.storage.asset_url(project_id, "product.png"),
            background_clean_url=None,
            target_bbox=self._bbox_model(primary.bbox),
            target_mask_url=None,
            target_regions=[
                ReplacementTargetRegion(
                    id=target.id,
                    label=target.label,
                    bbox=self._bbox_model(target.bbox),
                    source=target.source,
                    mask_url=target.mask_url,
                )
                for target in targets
            ],
            product_cutout_url=None,
            foreground_overlay_url=foreground_overlay_url,
            model_plan_url=self.storage.asset_url(project_id, "model_plan.json"),
            result_url=result_url,
            style_summary=f"{plan.scene_summary} {plan.subject_summary}".strip(),
            warnings=warnings + manifest.warnings,
        )
        self.storage.save_replacement(replacement)
        return replacement

    def _build_model_plan(
        self,
        project_id: str,
        manifest: ImageManifest,
        settings: ThirdPartySettings,
        warnings: list[str],
    ) -> ReplacementPlan:
        planner = OpenAIVisionPlanner(self.storage, settings)
        if not planner.available:
            raise RuntimeError(f"视觉规划模型不可用：{planner.reason}")
        plan = planner.plan(project_id, manifest)
        self.storage.save_json(project_id, "model_plan.json", plan.to_json())
        warnings.append(f"已使用视觉规划模型生成替换计划：{planner.reason}。")
        warnings.extend(plan.warnings)
        return plan

    def _image_edit_mask(
        self,
        manifest: ImageManifest,
        plan: ReplacementPlan,
        targets: list[_TargetCandidate],
        size: tuple[int, int],
    ) -> Image.Image:
        mask = Image.new("L", size, 0)
        draw = ImageDraw.Draw(mask)
        width, height = size
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
            text_path = self.storage.require_project_dir(manifest.project_id) / self._asset_rel_from_url(layer.mask_url)
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

    def _model_edit_prompt(self, plan: ReplacementPlan, manifest: ImageManifest) -> str:
        protected_text = "；".join(plan.preserve_text) or (self._ocr_text(manifest) or "")
        target_lines = [
            f"- {target.label}: bbox={target.bbox}, rationale={target.rationale}"
            for target in plan.targets
        ]
        protected_lines = [
            f"- {region.label}: bbox={region.bbox}, reason={region.reason}"
            for region in plan.protected_regions
        ]
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

    def _text_overlay(self, original: Image.Image, manifest: ImageManifest) -> tuple[Image.Image, Image.Image] | None:
        text = self._ocr_text(manifest)
        if not text:
            return None
        return rendered_text_overlay_asset(original.convert("RGB"), text)

    def _erase_text_layer_regions(self, image: Image.Image, manifest: ImageManifest, project_dir) -> Image.Image:
        cleaned = image.convert("RGBA")
        for layer in manifest.layers:
            if layer.type != "text" or not layer.mask_url:
                continue
            mask_path = project_dir / self._asset_rel_from_url(layer.mask_url)
            if mask_path.exists():
                cleaned = erase_masked_background_region(cleaned, Image.open(mask_path).convert("L"))
        return cleaned

    def _ocr_text(self, manifest: ImageManifest) -> str | None:
        texts: list[str] = []
        for layer in manifest.layers:
            if layer.type != "text":
                continue
            recognized_text = layer.attributes.extra.get("recognized_text") if layer.attributes else None
            if isinstance(recognized_text, str) and recognized_text.strip():
                texts.append(recognized_text.strip())
        return " ".join(texts) if texts else None

    def _has_paddleocr_pass(self, manifest: ImageManifest) -> bool:
        if any("OCR provider recognized" in warning for warning in manifest.warnings):
            return True
        return any(
            layer.type == "text"
            and isinstance(layer.attributes.extra.get("recognized_text"), str)
            and bool(layer.attributes.extra.get("recognized_text"))
            for layer in manifest.layers
        )

    def _asset_rel_from_url(self, url: str) -> str:
        marker = "/assets/"
        if marker not in url:
            return url.lstrip("/")
        parts = url.split(marker, 1)[1].split("/", 1)
        return parts[1] if len(parts) == 2 else ""

    def _bbox_model(self, bbox: tuple[int, int, int, int]) -> BBox:
        x, y, w, h = bbox
        return BBox(x=x, y=y, width=w, height=h)

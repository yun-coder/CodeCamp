from __future__ import annotations

import base64
from dataclasses import dataclass, field
import json
from pathlib import Path
import re
from typing import Any

import requests

from app.models import BBox, ImageManifest, ThirdPartySettings
from app.services.storage import ProjectStorage


@dataclass(frozen=True)
class PlannedTarget:
    id: str
    label: str
    bbox: tuple[int, int, int, int]
    priority: int = 1
    rationale: str = ""


@dataclass(frozen=True)
class ProtectedRegion:
    id: str
    label: str
    bbox: tuple[int, int, int, int]
    reason: str = ""


@dataclass(frozen=True)
class ReplacementPlan:
    subject_summary: str
    scene_summary: str
    edit_prompt: str
    targets: list[PlannedTarget] = field(default_factory=list)
    protected_regions: list[ProtectedRegion] = field(default_factory=list)
    preserve_text: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> dict[str, Any]:
        return {
            "subject_summary": self.subject_summary,
            "scene_summary": self.scene_summary,
            "edit_prompt": self.edit_prompt,
            "targets": [
                {
                    "id": target.id,
                    "label": target.label,
                    "bbox": {
                        "x": target.bbox[0],
                        "y": target.bbox[1],
                        "width": target.bbox[2],
                        "height": target.bbox[3],
                    },
                    "priority": target.priority,
                    "rationale": target.rationale,
                }
                for target in self.targets
            ],
            "protected_regions": [
                {
                    "id": region.id,
                    "label": region.label,
                    "bbox": {
                        "x": region.bbox[0],
                        "y": region.bbox[1],
                        "width": region.bbox[2],
                        "height": region.bbox[3],
                    },
                    "reason": region.reason,
                }
                for region in self.protected_regions
            ],
            "preserve_text": self.preserve_text,
            "warnings": self.warnings,
            "raw": self.raw,
        }


class OpenAIVisionPlanner:
    """Use a vision model to plan ecommerce product/person replacement."""

    def __init__(self, storage: ProjectStorage, settings: ThirdPartySettings) -> None:
        self.storage = storage
        self.enabled = settings.openai_vision_plan_enabled
        self.api_key = settings.openai_api_key
        self.base_url = settings.openai_base_url.rstrip("/")
        self.model = settings.openai_vision_model or settings.openai_model
        self.timeout = settings.openai_request_timeout
        self.available = bool(self.enabled and self.api_key and self.model)
        if not self.enabled:
            self.reason = "OpenAI vision planner is disabled"
        elif not self.api_key:
            self.reason = "OPENAI_API_KEY is not configured"
        else:
            self.reason = f"model={self.model}, base_url={self.base_url}"

    def plan(self, project_id: str, manifest: ImageManifest) -> ReplacementPlan:
        if not self.available:
            raise RuntimeError(self.reason)
        original_path = self.storage.original_path(project_id)
        product_path = self.storage.product_path(project_id)
        payload = {
            "model": self.model,
            "instructions": _planner_instructions(),
            "input": [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": self._prompt(manifest)},
                        {"type": "input_image", "image_url": _data_url(original_path), "detail": "original"},
                        {"type": "input_image", "image_url": _data_url(product_path), "detail": "original"},
                    ],
                }
            ],
            "store": False,
        }
        response = requests.post(
            self._endpoint("responses"),
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=self.timeout,
        )
        response.raise_for_status()
        data = response.json()
        text = _extract_responses_text(data)
        plan_data = _json_from_text(text)
        return self._normalize_plan(plan_data, manifest)

    def _prompt(self, manifest: ImageManifest) -> str:
        ocr_records = []
        for layer in manifest.layers:
            if layer.type != "text":
                continue
            text = layer.attributes.extra.get("recognized_text") if layer.attributes else None
            if isinstance(text, str) and text.strip():
                ocr_records.append(
                    {
                        "text": text.strip(),
                        "bbox": layer.bbox.model_dump(),
                    }
                )
        return json.dumps(
            {
                "task": "plan ecommerce poster product/person replacement",
                "canvas": {"width": manifest.width, "height": manifest.height},
                "input_images": {
                    "first": "original poster / scene image",
                    "second": "new product reference image",
                },
                "paddleocr_text_layers": ocr_records,
                "requirements": [
                    "Use PaddleOCR text as layout anchors and protected copy.",
                    "Find one or more target regions in the original image that should receive the product/person from the reference image.",
                    "Do not rely on local foreground parsing. Decide targets from visual understanding.",
                    "Return image-coordinate bounding boxes in pixels for the original image.",
                    "Keep original background style, poster frame, lighting, text hierarchy, and ecommerce layout.",
                    "If reference image is cropped, state how to preserve or repair head/neck/upper-body harmony.",
                    "Detect all visible text and UI/card areas even if PaddleOCR missed them.",
                    "Return protected_regions for titles, CTA buttons, inset card labels, original text, borders, and regions that must not be edited.",
                    "For complex posters, return separate targets for the large main model/product and any inset model/product card.",
                ],
            },
            ensure_ascii=False,
        )

    def _normalize_plan(self, data: dict[str, Any], manifest: ImageManifest) -> ReplacementPlan:
        targets: list[PlannedTarget] = []
        raw_targets = data.get("targets")
        if isinstance(raw_targets, list):
            for index, item in enumerate(raw_targets, start=1):
                if not isinstance(item, dict):
                    continue
                bbox = item.get("bbox")
                if not isinstance(bbox, dict):
                    continue
                normalized = _clamp_bbox(
                    bbox.get("x"),
                    bbox.get("y"),
                    bbox.get("width"),
                    bbox.get("height"),
                    manifest.width,
                    manifest.height,
                )
                if normalized is None:
                    continue
                targets.append(
                    PlannedTarget(
                        id=str(item.get("id") or f"model_target_{index}"),
                        label=str(item.get("label") or "模型规划替换区"),
                        bbox=normalized,
                        priority=int(item.get("priority") or index),
                        rationale=str(item.get("rationale") or ""),
                    )
                )
        if not targets:
            raise RuntimeError(f"Vision planner returned no valid targets: {data}")

        protected_regions: list[ProtectedRegion] = []
        raw_protected = data.get("protected_regions")
        if isinstance(raw_protected, list):
            for index, item in enumerate(raw_protected, start=1):
                if not isinstance(item, dict):
                    continue
                bbox = item.get("bbox")
                if not isinstance(bbox, dict):
                    continue
                normalized = _clamp_bbox(
                    bbox.get("x"),
                    bbox.get("y"),
                    bbox.get("width"),
                    bbox.get("height"),
                    manifest.width,
                    manifest.height,
                    min_area=64,
                )
                if normalized is None:
                    continue
                protected_regions.append(
                    ProtectedRegion(
                        id=str(item.get("id") or f"protected_region_{index}"),
                        label=str(item.get("label") or "受保护版式区域"),
                        bbox=normalized,
                        reason=str(item.get("reason") or ""),
                    )
                )

        preserve_text = [str(item).strip() for item in data.get("preserve_text", []) if str(item).strip()] if isinstance(data.get("preserve_text"), list) else []
        warnings = [str(item).strip() for item in data.get("warnings", []) if str(item).strip()] if isinstance(data.get("warnings"), list) else []
        return ReplacementPlan(
            subject_summary=str(data.get("subject_summary") or "模型已识别产品参考图主体。"),
            scene_summary=str(data.get("scene_summary") or "模型已识别原图电商版式。"),
            edit_prompt=str(data.get("edit_prompt") or _default_edit_prompt()),
            targets=sorted(targets, key=lambda target: target.priority),
            protected_regions=protected_regions,
            preserve_text=preserve_text,
            warnings=warnings,
            raw=data,
        )

    def _endpoint(self, suffix: str) -> str:
        if self.base_url.endswith(f"/{suffix}"):
            return self.base_url
        return f"{self.base_url}/{suffix}"


def _planner_instructions() -> str:
    return (
        "You are XiaoHua's ecommerce image workflow planner. "
        "Analyze the first image as the original poster and the second image as the product reference. "
        "Return ONLY valid JSON. Do not wrap it in markdown. "
        "Schema: {"
        "\"scene_summary\": string, "
        "\"subject_summary\": string, "
        "\"targets\": [{\"id\": string, \"label\": string, \"bbox\": {\"x\": number, \"y\": number, \"width\": number, \"height\": number}, \"priority\": number, \"rationale\": string}], "
        "\"protected_regions\": [{\"id\": string, \"label\": string, \"bbox\": {\"x\": number, \"y\": number, \"width\": number, \"height\": number}, \"reason\": string}], "
        "\"preserve_text\": [string], "
        "\"edit_prompt\": string, "
        "\"warnings\": [string]"
        "}. "
        "Targets and protected_regions must be pixel coordinates in the original image. "
        "If the poster contains multiple people/products, return multiple targets. "
        "Preserve all OCR text, visible text, CTA buttons, card borders, and layout."
    )


def _default_edit_prompt() -> str:
    return (
        "Replace the original ecommerce poster's model/product region with the reference product/person. "
        "Preserve background, lighting, poster frame, text, and layout. Keep the result natural and commercial."
    )


def _data_url(path: Path) -> str:
    suffix = path.suffix.lower()
    mime = "image/png"
    if suffix in {".jpg", ".jpeg"}:
        mime = "image/jpeg"
    elif suffix == ".webp":
        mime = "image/webp"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _extract_responses_text(data: dict[str, Any]) -> str:
    if isinstance(data.get("output_text"), str):
        return str(data["output_text"]).strip()
    chunks: list[str] = []
    for item in data.get("output", []) or []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []) or []:
            if isinstance(content, dict) and isinstance(content.get("text"), str):
                chunks.append(content["text"])
    return "\n".join(chunks).strip()


def _json_from_text(text: str) -> dict[str, Any]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            raise RuntimeError(f"Vision planner did not return JSON: {text[:500]}")
        data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise RuntimeError(f"Vision planner JSON must be an object: {data}")
    return data


def _clamp_bbox(
    x: object,
    y: object,
    width: object,
    height: object,
    canvas_w: int,
    canvas_h: int,
    min_area: int | None = None,
) -> tuple[int, int, int, int] | None:
    try:
        bx, by, bw, bh = int(round(float(x))), int(round(float(y))), int(round(float(width))), int(round(float(height)))
    except (TypeError, ValueError):
        return None
    bx = max(0, min(bx, canvas_w - 1))
    by = max(0, min(by, canvas_h - 1))
    bw = max(1, min(bw, canvas_w - bx))
    bh = max(1, min(bh, canvas_h - by))
    area_threshold = min_area if min_area is not None else max(256, canvas_w * canvas_h * 0.002)
    if bw * bh < area_threshold:
        return None
    return bx, by, bw, bh

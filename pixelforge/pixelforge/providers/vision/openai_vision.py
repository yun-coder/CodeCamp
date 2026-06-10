"""MiniMax-VL-based grounding and planning provider.

Replaces the OpenAI-Vision planner with MiniMax's chat completions API.
MiniMax uses the same base URL pattern but requires an extra header:
  - Authorization: Bearer <api_key>
  - MiniMax-Group-ID: <group_id>

The underlying /chat/completions endpoint accepts the same image_url content
type, so the prompt templates and response parsing are preserved unchanged.
"""
from __future__ import annotations

import base64
import json
from dataclasses import dataclass, field
from io import BytesIO
from typing import Any

import requests
from PIL import Image

from pixelforge.core.settings import PixelforgeSettings
from pixelforge.providers.base import GroundedObject, GroundingProvider


def _to_data_url(image: Image.Image) -> str:
    buf = BytesIO()
    image.convert("RGB").save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


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
                    "id": t.id,
                    "label": t.label,
                    "bbox": {
                        "x": t.bbox[0],
                        "y": t.bbox[1],
                        "width": t.bbox[2],
                        "height": t.bbox[3],
                    },
                    "priority": t.priority,
                    "rationale": t.rationale,
                }
                for t in self.targets
            ],
            "protected_regions": [
                {
                    "id": r.id,
                    "label": r.label,
                    "bbox": {
                        "x": r.bbox[0],
                        "y": r.bbox[1],
                        "width": r.bbox[2],
                        "height": r.bbox[3],
                    },
                    "reason": r.reason,
                }
                for r in self.protected_regions
            ],
            "preserve_text": self.preserve_text,
            "warnings": self.warnings,
            "raw": self.raw,
        }


class OpenAIVisionPlanner:
    """VLM planner using MiniMax chat completions with vision support.

    Args:
        settings: PixelforgeSettings with minimax config populated.
                  Requires MINIMAX_API_KEY in .env.
    """

    name = "minimax_vision"

    def __init__(self, settings: PixelforgeSettings) -> None:
        cfg = settings.minimax
        self.api_key = cfg.api_key
        self.base_url = cfg.base_url.rstrip("/")
        self.model = cfg.vision_model
        self.timeout = cfg.request_timeout
        self.enabled = cfg.vision_plan_enabled
        self.available = bool(self.enabled and self.api_key)

        if not self.enabled:
            self.reason = "MiniMax vision planning is disabled (MINIMAX_VISION_PLAN_ENABLED=0)"
        elif not self.api_key:
            self.reason = "MINIMAX_API_KEY is not configured"
        else:
            self.reason = f"MiniMax VL: {self.model} → {self.base_url}/chat/completions"

    # ── Protocol: GroundingProvider ────────────────────────────────
    def ground(self, image: Image.Image, *, task: str) -> list[GroundedObject]:
        if not self.available:
            return []
        prompt = self._build_ground_prompt(task)
        raw = self._chat_with_images(prompt, [image], response_format="json_object")
        return self._parse_ground_response(raw)

    # ── Workflow: ReplacementPlan (richer than ground) ────────────
    def plan_replacement(
        self, original: Image.Image, product: Image.Image, *, ocr_text: str | None = None
    ) -> ReplacementPlan:
        if not self.available:
            raise RuntimeError(f"Vision planner unavailable: {self.reason}")
        prompt = self._build_replacement_prompt(ocr_text or "")
        raw = self._chat_with_images(
            prompt, [original, product], response_format="json_object"
        )
        return self._parse_replacement_response(raw)

    # ── Internals ─────────────────────────────────────────────────
    def _build_ground_prompt(self, task: str) -> str:
        return (
            f"You are grounding objects in an image for the task: {task}.\n"
            "Return a JSON object: {\"objects\": [{\"id\", \"label\", "
            "\"bbox\": [x, y, w, h], \"confidence\": 0..1}]}.\n"
            "Coordinates are pixel-space (x, y, width, height) relative to the "
            "image. Bbox edges must be inside the image. Return 3–8 most "
            "salient objects."
        )

    def _build_replacement_prompt(self, ocr_text: str) -> str:
        preserved = ocr_text or "(none)"
        return (
            "你正在为一张中文电商海报做产品/人物替换规划。\n"
            "输入有两张图：第一张是原图（要替换的目标海报），第二张是产品参考图。\n"
            "请输出 JSON：\n"
            "{\n"
            '  "subject_summary": "原图主体一句话",\n'
            '  "scene_summary": "原图场景一句话",\n'
            '  "edit_prompt": "给图片编辑模型的详细 prompt",\n'
            '  "targets": [{"id", "label", "bbox": [x,y,w,h], "priority": 1..3, "rationale": "..."}],\n'
            '  "protected_regions": [{"id", "label", "bbox": [x,y,w,h], "reason": "..."}],\n'
            '  "preserve_text": ["..."]\n'
            "}\n"
            f"原图 OCR 文字：{preserved}"
        )

    def _chat_with_images(
        self,
        prompt: str,
        images: list[Image.Image],
        *,
        response_format: str | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for image in images:
            content.append(
                {"type": "image_url", "image_url": {"url": _to_data_url(image)}}
            )
        body: dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": "user", "content": content}],
            "temperature": 0.2,
        }
        if response_format == "json_object":
            body["response_format"] = {"type": "json_object"}
        response = requests.post(url, headers=headers, json=body, timeout=self.timeout)
        response.raise_for_status()
        data = response.json()
        message = data["choices"][0]["message"]["content"]
        # The model may wrap JSON in ```json ... ``` fences
        if isinstance(message, str):
            text = message.strip()
            if text.startswith("```"):
                text = text.strip("`")
                if "\n" in text:
                    text = text.split("\n", 1)[1]
            return json.loads(text)
        return message

    def _parse_ground_response(self, raw: dict[str, Any]) -> list[GroundedObject]:
        objects: list[GroundedObject] = []
        for i, obj in enumerate(raw.get("objects", [])):
            try:
                x, y, w, h = obj["bbox"]
            except (KeyError, ValueError, TypeError):
                continue
            objects.append(
                GroundedObject(
                    id=str(obj.get("id", f"obj_{i}")),
                    label=str(obj.get("label", "object")),
                    bbox=(int(x), int(y), int(w), int(h)),
                    confidence=float(obj.get("confidence", 0.5)),
                )
            )
        return objects

    def _parse_replacement_response(self, raw: dict[str, Any]) -> ReplacementPlan:
        targets = [
            PlannedTarget(
                id=str(t.get("id", f"target_{i}")),
                label=str(t.get("label", "target")),
                bbox=tuple(t["bbox"]),  # type: ignore[arg-type]
                priority=int(t.get("priority", 1)),
                rationale=str(t.get("rationale", "")),
            )
            for i, t in enumerate(raw.get("targets", []))
        ]
        protected = [
            ProtectedRegion(
                id=str(r.get("id", f"protected_{i}")),
                label=str(r.get("label", "region")),
                bbox=tuple(r["bbox"]),  # type: ignore[arg-type]
                reason=str(r.get("reason", "")),
            )
            for i, r in enumerate(raw.get("protected_regions", []))
        ]
        preserve = [str(t) for t in raw.get("preserve_text", []) if t]
        return ReplacementPlan(
            subject_summary=str(raw.get("subject_summary", "")),
            scene_summary=str(raw.get("scene_summary", "")),
            edit_prompt=str(raw.get("edit_prompt", "")),
            targets=targets,
            protected_regions=protected,
            preserve_text=preserve,
            raw=raw,
        )


# Protocol self-check
_ = GroundingProvider

"""PaddleOCR Cloud provider — direct port of ImageLayerAgent's provider.

PaddleOCR exposes an asynchronous jobs API: ``POST /api/v2/ocr/jobs`` to
submit, then ``GET /api/v2/ocr/jobs/{jobId}`` to poll until the job is
``done``, then download the result from the returned ``jsonUrl``.
"""
from __future__ import annotations

import json
import os
import re
import tempfile
import time
from typing import Any

import numpy as np
import requests
from PIL import Image

from pixelforge.core.settings import PixelforgeSettings
from pixelforge.providers.base import OCRProvider, TextBox


_DEFAULT_OCR_PROMPT = (
    "请完整识别电商海报中的所有可见文字和版式文字区域。"
    "包括标题、品牌、LOGO、英文按钮、CTA、搭配卡片标题、促销文案、商品描述、价格、尺码、角标和短词。"
    "不要因为文字较短、是英文、像按钮文案或装饰标题就忽略，例如 GO、COLLOCATION、CLICK IT 都需要识别。"
    "请尽量保留每个文字区域的准确位置框，用于后续保护原图文案和版式。"
)


def _clean_ocr_label(value: object) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", text)
    text = re.sub(r"<img\b[^>]*>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"</?div[^>]*>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"^[#>\-\s`*_]+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if text.lower() in {"image", "img", "figure", "picture", "photo"}:
        return ""
    return text


def _bbox_from_polygon(points: object) -> tuple[int, int, int, int] | None:
    try:
        arr = np.array(points, dtype=float)
    except (TypeError, ValueError):
        return None
    if arr.size < 4:
        return None
    if arr.ndim == 1:
        flat = arr.flatten()
        x1, y1, x2, y2 = flat[:4]
        x_min, y_min = min(x1, x2), min(y1, y2)
        x_max, y_max = max(x1, x2), max(y1, y2)
    else:
        pts = arr.reshape(-1, arr.shape[-1])
        if pts.shape[1] < 2:
            return None
        x_min = float(pts[:, 0].min())
        y_min = float(pts[:, 1].min())
        x_max = float(pts[:, 0].max())
        y_max = float(pts[:, 1].max())
    width = int(round(x_max - x_min))
    height = int(round(y_max - y_min))
    if width <= 0 or height <= 0:
        return None
    return int(round(x_min)), int(round(y_min)), width, height


def _first(data: dict[str, Any], *keys: str) -> Any:
    for k in keys:
        if k in data and data[k] is not None:
            return data[k]
    return None


class PaddleOCRCloudProvider:
    """PaddleOCR official cloud API provider using the REST jobs endpoint."""

    name = "paddleocr_cloud"

    def __init__(self, settings: PixelforgeSettings) -> None:
        cfg = settings.paddleocr
        self.token = cfg.access_token
        self.base_url = cfg.base_url
        self.model = cfg.model
        self.request_timeout = cfg.request_timeout
        self.poll_timeout = cfg.poll_timeout
        self.optional_payload = {
            "useDocOrientationClassify": cfg.use_doc_orientation_classify,
            "useDocUnwarping": cfg.use_doc_unwarping,
            "useChartRecognition": cfg.use_chart_recognition,
        }
        self.prompt = cfg.prompt or _DEFAULT_OCR_PROMPT
        self.available = False
        self.reason = ""
        if not self.token:
            self.reason = "PADDLEOCR_ACCESS_TOKEN is not configured"
            return
        self.job_url = self._jobs_url(self.base_url)
        self.available = True
        self.reason = f"model={self.model}, jobs_url={self.job_url}"

    @staticmethod
    def _jobs_url(base_url: str) -> str:
        base = (base_url or "https://paddleocr.aistudio-app.com").rstrip("/")
        if base.endswith("/api/v2/ocr/jobs"):
            return base
        return f"{base}/api/v2/ocr/jobs"

    # ── Public API ────────────────────────────────────────────────
    def read_text(self, image: Image.Image, *, hint: str = "") -> list[TextBox]:
        if not self.available:
            return []
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            temp_path = tmp.name
        try:
            image.convert("RGB").save(temp_path)
            job_id = self._submit_file(temp_path)
            jsonl_url = self._poll_result_url(job_id)
            return self._read_jsonl_results(jsonl_url, image.size)
        except Exception as exc:
            self.reason = f"PaddleOCR cloud failed: {exc}"
            return []
        finally:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

    # ── Internals ─────────────────────────────────────────────────
    def _submit_file(self, file_path: str) -> str:
        headers = {"Authorization": f"Bearer {self.token}"}
        data: dict[str, object] = {
            "model": self.model,
            "optionalPayload": json.dumps(self.optional_payload),
        }
        if self.prompt:
            data["prompt"] = self.prompt
        with open(file_path, "rb") as file_obj:
            response = requests.post(
                self.job_url,
                headers=headers,
                data=data,
                files={"file": file_obj},
                timeout=self.request_timeout,
            )
        response.raise_for_status()
        payload = response.json()
        job_id = payload.get("data", {}).get("jobId")
        if not job_id:
            raise RuntimeError(f"PaddleOCR job response missing jobId: {payload}")
        return str(job_id)

    def _poll_result_url(self, job_id: str) -> str:
        headers = {"Authorization": f"Bearer {self.token}"}
        deadline = time.monotonic() + self.poll_timeout
        while True:
            response = requests.get(
                f"{self.job_url}/{job_id}", headers=headers, timeout=self.request_timeout
            )
            response.raise_for_status()
            payload = response.json()
            data = payload.get("data", {})
            state = data.get("state")
            if state == "done":
                json_url = data.get("resultUrl", {}).get("jsonUrl")
                if not json_url:
                    raise RuntimeError(
                        f"PaddleOCR job {job_id} finished without jsonUrl"
                    )
                return str(json_url)
            if state == "failed":
                error_msg = data.get("errorMsg") or "unknown error"
                raise RuntimeError(f"PaddleOCR job {job_id} failed: {error_msg}")
            if time.monotonic() >= deadline:
                raise TimeoutError(
                    f"PaddleOCR job {job_id} did not finish within {self.poll_timeout} seconds"
                )
            time.sleep(5)

    def _read_jsonl_results(
        self, jsonl_url: str, image_size: tuple[int, int]
    ) -> list[TextBox]:
        response = requests.get(jsonl_url, timeout=self.request_timeout)
        response.raise_for_status()
        boxes: list[TextBox] = []
        for line in response.text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            for obj in self._objects_from_ocr_row(row):
                boxes.append(obj)
        return boxes

    def _objects_from_ocr_row(self, row: dict[str, Any]) -> list[TextBox]:
        data = row.get("res", row)
        if not isinstance(data, dict):
            return []
        text_values = _first(data, "rec_texts", "texts")
        score_values = _first(data, "rec_scores", "scores")
        box_values = _first(data, "rec_boxes", "rec_polys", "dt_polys")
        if text_values is None or box_values is None:
            return []
        texts = list(text_values)
        scores = list(score_values) if score_values is not None else []
        boxes = list(box_values) if box_values is not None else []
        result: list[TextBox] = []
        for index, text in enumerate(texts):
            label = _clean_ocr_label(text)
            if not label:
                continue
            score = float(scores[index]) if index < len(scores) else 1.0
            try:
                box_item = boxes[index]
            except (IndexError, TypeError):
                continue
            bbox = _bbox_from_polygon(box_item)
            if bbox is None:
                continue
            result.append(
                TextBox(
                    bbox=bbox,
                    text=label,
                    confidence=max(0.0, min(1.0, score)),
                )
            )
        return result


# Protocol self-check (also serves as a runtime hint if a class is refactored)
assert isinstance(PaddleOCRCloudProvider, type)
# OCRProvider is a runtime_checkable Protocol; check structural conformance
# only when actually used. The Protocol is satisfied by ``read_text``.
_ = OCRProvider  # silence "imported but unused"

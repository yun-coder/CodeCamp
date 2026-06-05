from __future__ import annotations

from dataclasses import dataclass
import json
import os
import re
import tempfile
import time
from typing import Protocol

import numpy as np
from PIL import Image
import requests

from app.models import ThirdPartySettings


@dataclass
class GroundedObject:
    label: str
    bbox: tuple[int, int, int, int]
    confidence: float
    prompt: str | None = None


class VisionGroundingProvider(Protocol):
    def detect(self, image: Image.Image, task_hint: str) -> list[GroundedObject]:
        """Return grounded objects such as product, model, text, logo, and background."""


class SegmentationProvider(Protocol):
    def segment(self, image: Image.Image, objects: list[GroundedObject]) -> dict[str, Image.Image]:
        """Return label-to-mask images for grounded objects."""


class OCRProvider(Protocol):
    def read_text(self, image: Image.Image) -> list[GroundedObject]:
        """Return text boxes and recognized text."""


class GenerativeRepairProvider(Protocol):
    def repair(self, image: Image.Image, mask: Image.Image, prompt: str) -> Image.Image:
        """Repair or harmonize recomposed images with an inpainting/editing model."""


class ProviderRegistry:
    """Extension point for future AI-backed providers.

    The MVP analyzer works without providers. Later, wire Qwen-VL/GPT Vision for
    grounding, SAM2 for segmentation, PaddleOCR Cloud for text, and FLUX Kontext
    or DreamOmni2 for repair.
    """

    def __init__(self) -> None:
        self.grounding: VisionGroundingProvider | None = None
        self.segmentation: SegmentationProvider | None = None
        self.ocr: OCRProvider | None = None
        self.repair: GenerativeRepairProvider | None = None
        self.provider_details: dict[str, dict[str, str | bool | None]] = {}


def _provider_detail(provider: object) -> dict[str, str | bool | None]:
    return {
        "provider": getattr(provider, "name", None),
        "available": bool(getattr(provider, "available", False)),
        "detail": getattr(provider, "reason", "") or getattr(provider, "detail", ""),
    }


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
        x_min = float(np.min(pts[:, 0]))
        y_min = float(np.min(pts[:, 1]))
        x_max = float(np.max(pts[:, 0]))
        y_max = float(np.max(pts[:, 1]))
    width = int(round(x_max - x_min))
    height = int(round(y_max - y_min))
    if width <= 0 or height <= 0:
        return None
    return int(round(x_min)), int(round(y_min)), width, height


def _first_result_value(data: dict[str, object], keys: tuple[str, ...]) -> object | None:
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return None


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


def _default_ocr_prompt() -> str:
    return (
        "请完整识别电商海报中的所有可见文字和版式文字区域。"
        "包括标题、品牌、LOGO、英文按钮、CTA、搭配卡片标题、促销文案、商品描述、价格、尺码、角标和短词。"
        "不要因为文字较短、是英文、像按钮文案或装饰标题就忽略，例如 GO、COLLOCATION、CLICK IT 都需要识别。"
        "请尽量保留每个文字区域的准确位置框，用于后续保护原图文案和版式。"
    )


_SHORT_CLOTHING_KEYWORDS: set[str] = {
    "棉", "麻", "丝", "S", "M", "L", "XL", "XXL", "XXXL",
    "¥", "￥", "元",
    "裙", "裤", "衣", "衫", "帽", "领", "袖",
    "黑", "白", "红", "蓝", "绿", "灰", "粉",
}

_LONG_CLOTHING_KEYWORDS: set[str] = {
    "品牌", "羊毛", "羊绒", "聚酯", "涤纶", "氨纶", "弹力",
    "透气", "尺码",
    "新款", "限时", "折扣", "售价",
    "上衣", "裤子", "裙子", "外套", "T恤", "衬衫", "卫衣", "夹克",
    "修身", "宽松", "韩版", "日系", "欧美", "潮流", "百搭",
    "纯色", "印花", "条纹", "格子", "碎花",
    "面料", "成分", "里料", "填充",
    "颜色", "时尚", "舒适", "显瘦", "女装", "男装", "童装",
}


def _is_clothing_relevant(text: str) -> bool:
    if not text or not text.strip():
        return False
    lowered = text.strip().lower()
    if any(kw.lower() == lowered for kw in _SHORT_CLOTHING_KEYWORDS):
        return True
    if any(kw.lower() in lowered for kw in _LONG_CLOTHING_KEYWORDS):
        return True
    if len(lowered) >= 2 and any("一" <= ch <= "鿿" for ch in text):
        return True
    return False


def _filter_layout_texts(objects: list[GroundedObject]) -> list[GroundedObject]:
    # Replacement workflows need all layout text, not only clothing words.
    # Short ecommerce CTA/title strings such as GO, COLLOCATION, CLICK IT are
    # important layout anchors and must not be dropped here.
    return [obj for obj in objects if obj.label and obj.label.strip()]


def _objects_from_ocr_data(data: dict[str, object], min_confidence: float) -> list[GroundedObject]:
    data = data.get("res", data)
    if not isinstance(data, dict):
        return []
    text_values = _first_result_value(data, ("rec_texts", "texts"))
    score_values = _first_result_value(data, ("rec_scores", "scores"))
    box_values = _first_result_value(data, ("rec_boxes", "rec_polys", "dt_polys"))
    texts = list(text_values) if text_values is not None else []
    scores = list(score_values) if score_values is not None else []
    boxes = box_values if box_values is not None else []
    objects: list[GroundedObject] = []
    for index, text in enumerate(texts):
        label = _clean_ocr_label(text)
        if not label:
            continue
        score = float(scores[index]) if index < len(scores) else 1.0
        if score < min_confidence:
            continue
        try:
            box_item = boxes[index]
        except (IndexError, TypeError):
            continue
        bbox = _bbox_from_polygon(box_item)
        if bbox is None:
            continue
        objects.append(GroundedObject(label=label, bbox=bbox, confidence=max(0.0, min(1.0, score)), prompt=label))
    return objects


def _objects_from_markdown(markdown: str, image_size: tuple[int, int]) -> list[GroundedObject]:
    lines = [_clean_ocr_label(line) for line in markdown.splitlines()]
    lines = [line for line in lines if line]
    width, height = image_size
    if not lines or width <= 0 or height <= 0:
        return []
    max_lines = min(len(lines), 64)
    y_padding = max(8, round(height * 0.03))
    x_padding = max(8, round(width * 0.03))
    usable_width = max(1, width - x_padding * 2)
    line_height = max(18, min(72, (height - y_padding * 2) // max(max_lines, 1)))
    objects: list[GroundedObject] = []
    for index, line in enumerate(lines[:max_lines]):
        y = min(max(0, y_padding + index * line_height), max(0, height - line_height))
        objects.append(
            GroundedObject(
                label=line,
                bbox=(x_padding, y, usable_width, line_height),
                confidence=1.0,
                prompt=line,
            )
        )
    return objects


class PaddleOCRCloudProvider:
    """PaddleOCR official cloud API provider using the REST jobs endpoint."""

    name = "paddleocr_cloud"

    def __init__(self, settings: ThirdPartySettings) -> None:
        self.token = settings.paddleocr_access_token
        self.base_url = settings.paddleocr_base_url
        self.model = settings.paddleocr_model
        self.request_timeout = settings.paddleocr_request_timeout
        self.poll_timeout = settings.paddleocr_poll_timeout
        self.optional_payload = {
            "useDocOrientationClassify": settings.paddleocr_use_doc_orientation_classify,
            "useDocUnwarping": settings.paddleocr_use_doc_unwarping,
            "useChartRecognition": settings.paddleocr_use_chart_recognition,
        }
        self.prompt = settings.paddleocr_prompt or _default_ocr_prompt()
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

    def read_text(self, image: Image.Image) -> list[GroundedObject]:
        if not self.available:
            return []
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            temp_path = tmp.name
        try:
            image.convert("RGB").save(temp_path)
            job_id = self._submit_file(temp_path)
            jsonl_url = self._poll_result_url(job_id)
            objects = self._read_jsonl_results(jsonl_url, image.size)
            return _filter_layout_texts(objects)
        except Exception as exc:
            self.reason = f"PaddleOCR cloud failed: {exc}"
            return []
        finally:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

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
            response = requests.get(f"{self.job_url}/{job_id}", headers=headers, timeout=self.request_timeout)
            response.raise_for_status()
            payload = response.json()
            data = payload.get("data", {})
            state = data.get("state")
            if state == "done":
                json_url = data.get("resultUrl", {}).get("jsonUrl")
                if not json_url:
                    raise RuntimeError(f"PaddleOCR job {job_id} finished without jsonUrl")
                return str(json_url)
            if state == "failed":
                error_msg = data.get("errorMsg") or "unknown error"
                raise RuntimeError(f"PaddleOCR job {job_id} failed: {error_msg}")
            if time.monotonic() >= deadline:
                raise TimeoutError(f"PaddleOCR job {job_id} did not finish within {self.poll_timeout} seconds")
            time.sleep(5)

    def _read_jsonl_results(self, jsonl_url: str, image_size: tuple[int, int]) -> list[GroundedObject]:
        response = requests.get(jsonl_url, timeout=self.request_timeout)
        response.raise_for_status()
        objects: list[GroundedObject] = []
        for line in response.text.splitlines():
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            result = payload.get("result", {})
            if not isinstance(result, dict):
                continue
            objects.extend(self._objects_from_result(result, image_size))
        return objects

    def _objects_from_result(self, result: dict[str, object], image_size: tuple[int, int]) -> list[GroundedObject]:
        objects: list[GroundedObject] = []
        for item in result.get("ocrResults", []) or []:
            if not isinstance(item, dict):
                continue
            pruned = item.get("prunedResult") or item.get("pruned_result") or item
            if isinstance(pruned, dict):
                objects.extend(_objects_from_ocr_data(pruned, 0.0))
        for item in result.get("layoutParsingResults", []) or []:
            if not isinstance(item, dict):
                continue
            pruned = item.get("prunedResult") or item.get("pruned_result")
            if isinstance(pruned, dict):
                objects.extend(_objects_from_ocr_data(pruned, 0.0))
            markdown = item.get("markdown")
            if isinstance(markdown, dict):
                text = markdown.get("text")
                if isinstance(text, str):
                    objects.extend(_objects_from_markdown(text, image_size))
        return objects


class SAM2SegmentationProvider:
    """Optional SAM2 bbox-prompt mask refiner.

    Enable with:
    - ILA_ENABLE_SAM2=1
    - SAM2_MODEL_CFG=<config yaml>
    - SAM2_CHECKPOINT=<checkpoint path>
    """

    name = "sam2"

    def __init__(self, settings: ThirdPartySettings | None = None) -> None:
        settings = settings or ThirdPartySettings()
        self.enabled = settings.sam2_enabled or os.environ.get("ILA_ENABLE_SAM2", "0") == "1"
        self.model_cfg = settings.sam2_model_cfg or os.environ.get("SAM2_MODEL_CFG")
        self.checkpoint = settings.sam2_checkpoint or os.environ.get("SAM2_CHECKPOINT") or os.environ.get("SAM2_MODEL_PATH")
        self.available = False
        self.reason = "disabled"
        self._predictor = None
        if self.enabled:
            self._load()

    def _load(self) -> None:
        if not self.model_cfg or not self.checkpoint:
            self.reason = "SAM2_MODEL_CFG and SAM2_CHECKPOINT are required"
            return
        try:
            import torch
            from sam2.build_sam import build_sam2
            from sam2.sam2_image_predictor import SAM2ImagePredictor

            device = "cuda" if torch.cuda.is_available() else "cpu"
            model = build_sam2(self.model_cfg, self.checkpoint, device=device)
            self._predictor = SAM2ImagePredictor(model)
            self.available = True
            self.reason = f"loaded on {device}"
        except Exception as exc:  # pragma: no cover - optional dependency
            self.reason = f"SAM2 unavailable: {exc}"
            self._predictor = None

    def segment(self, image: Image.Image, objects: list[GroundedObject]) -> dict[str, Image.Image]:
        if not self.available or self._predictor is None:
            return {}
        image_arr = np.array(image.convert("RGB"))
        self._predictor.set_image(image_arr)
        masks: dict[str, Image.Image] = {}
        for obj in objects:
            x, y, w, h = obj.bbox
            box = np.array([x, y, x + w, y + h], dtype=np.float32)
            try:
                pred_masks, scores, _ = self._predictor.predict(box=box, multimask_output=True)
            except TypeError:
                pred_masks, scores, _ = self._predictor.predict(
                    box=box[None, :],
                    multimask_output=True,
                )
            if len(pred_masks) == 0:
                continue
            best = int(np.argmax(scores))
            mask = (pred_masks[best].astype("uint8") * 255)
            masks[obj.label] = Image.fromarray(mask, mode="L")
        return masks


def build_provider_registry(settings: ThirdPartySettings | None = None) -> ProviderRegistry:
    settings = settings or ThirdPartySettings()
    registry = ProviderRegistry()
    ocr_provider = settings.ocr_provider
    if ocr_provider == "paddleocr_cloud":
        cloud_ocr = PaddleOCRCloudProvider(settings)
        registry.provider_details["paddleocr_cloud"] = _provider_detail(cloud_ocr)
        if cloud_ocr.available:
            registry.ocr = cloud_ocr
    segmentation = SAM2SegmentationProvider(settings)
    registry.provider_details["sam2"] = _provider_detail(segmentation)
    if segmentation.available:
        registry.segmentation = segmentation
    return registry


def provider_status(registry: ProviderRegistry) -> dict[str, dict[str, str | bool | None]]:
    ocr = registry.ocr
    sam2_detail = registry.provider_details.get("sam2", {"provider": "sam2", "available": False, "detail": "not checked"})
    active_ocr = (
        {
            "provider": getattr(ocr, "name", None),
            "available": ocr is not None,
            "detail": getattr(ocr, "reason", "") if ocr is not None else "no OCR provider available",
        }
        if ocr is not None
        else {"provider": None, "available": False, "detail": "no OCR provider available"}
    )
    return {
        "ocr": active_ocr,
        "paddleocr_cloud": registry.provider_details.get("paddleocr_cloud", {"provider": "paddleocr_cloud", "available": False, "detail": "not checked"}),
        "segmentation": sam2_detail,
    }

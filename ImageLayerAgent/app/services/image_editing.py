from __future__ import annotations

import base64
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any, Protocol

from PIL import Image, ImageFilter
import requests

from app.models import ThirdPartySettings


@dataclass(frozen=True)
class ImageEditResult:
    image: Image.Image
    detail: str


class ImageEditProvider(Protocol):
    available: bool
    reason: str

    def edit_product_replacement(
        self,
        original: Image.Image,
        product: Image.Image,
        edit_mask: Image.Image,
        prompt: str,
        work_dir: Path,
    ) -> ImageEditResult | None:
        """Generate the final replacement image from scene, product reference, mask and prompt."""


class DisabledImageEditProvider:
    name = "none"

    def __init__(self, reason: str = "Image edit provider is disabled") -> None:
        self.available = False
        self.reason = reason

    def edit_product_replacement(
        self,
        original: Image.Image,
        product: Image.Image,
        edit_mask: Image.Image,
        prompt: str,
        work_dir: Path,
    ) -> ImageEditResult | None:
        return None


class OpenAIImagesEditProvider:
    """Final image harmonization with an OpenAI-compatible Images edit API."""

    name = "openai_images"

    def __init__(self, settings: ThirdPartySettings) -> None:
        self.enabled = settings.openai_image_edit_enabled
        self.api_key = settings.openai_api_key
        self.base_url = settings.openai_base_url.rstrip("/")
        self.model = settings.openai_image_model
        self.quality = settings.openai_image_quality
        self.timeout = settings.openai_request_timeout
        self.available = bool(self.enabled and self.api_key)
        if not self.enabled:
            self.reason = "Image edit is disabled"
        elif not self.api_key:
            self.reason = "OPENAI_API_KEY is not configured"
        else:
            self.reason = f"provider=openai_images, model={self.model}, base_url={self.base_url}"

    def edit_product_replacement(
        self,
        original: Image.Image,
        product: Image.Image,
        edit_mask: Image.Image,
        prompt: str,
        work_dir: Path,
    ) -> ImageEditResult | None:
        if not self.available:
            return None

        work_dir.mkdir(parents=True, exist_ok=True)
        original_rgba = original.convert("RGBA")
        product_rgba = product.convert("RGBA")
        mask_rgba = _alpha_mask(edit_mask, original_rgba.size)

        padded_original = _pad_to_image_api_size(original_rgba, fill=(255, 255, 255, 255))
        padded_mask = _pad_to_image_api_size(mask_rgba, fill=(255, 255, 255, 0))
        padded_product = _pad_to_image_api_size(product_rgba, fill=(255, 255, 255, 255))

        original_path = work_dir / "openai_edit_original.png"
        product_path = work_dir / "openai_edit_product_reference.png"
        mask_path = work_dir / "openai_edit_mask.png"
        padded_original.save(original_path)
        padded_product.save(product_path)
        padded_mask.save(mask_path)

        url = f"{self.base_url}/images/edits"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        data: dict[str, str] = {
            "model": self.model,
            "prompt": prompt,
            "quality": self.quality,
            "output_format": "png",
            "size": f"{padded_original.width}x{padded_original.height}",
        }
        with original_path.open("rb") as original_file, product_path.open("rb") as product_file, mask_path.open("rb") as mask_file:
            files = [
                ("image[]", ("original.png", original_file, "image/png")),
                ("image[]", ("product_reference.png", product_file, "image/png")),
                ("mask", ("mask.png", mask_file, "image/png")),
            ]
            response = requests.post(url, headers=headers, data=data, files=files, timeout=self.timeout)
        if not response.ok:
            raise RuntimeError(f"OpenAI Images edit failed: HTTP {response.status_code}: {_short_body(response.text)}")
        payload = response.json()
        image_bytes = _extract_image_bytes(payload, timeout=self.timeout)
        decoded = Image.open(BytesIO(image_bytes)).convert("RGBA")
        if decoded.size != padded_original.size:
            decoded = decoded.resize(padded_original.size, Image.Resampling.LANCZOS)
        decoded = decoded.crop((0, 0, original_rgba.width, original_rgba.height))
        return ImageEditResult(image=decoded, detail=self.reason)


class CustomHTTPImageEditProvider:
    """Generic JSON provider for external image edit models.

    The endpoint receives data URLs for the scene, product reference and edit
    mask. It can return b64_json, image_base64, image, url, image_url, data[0],
    images[0], or output[0].
    """

    name = "custom_http"

    def __init__(self, settings: ThirdPartySettings) -> None:
        self.enabled = settings.openai_image_edit_enabled
        self.endpoint = (settings.custom_image_edit_endpoint or "").strip()
        self.api_key = settings.custom_image_edit_api_key
        self.model = settings.custom_image_edit_model
        self.timeout = settings.openai_request_timeout
        self.available = bool(self.enabled and self.endpoint)
        if not self.enabled:
            self.reason = "Image edit is disabled"
        elif not self.endpoint:
            self.reason = "CUSTOM_IMAGE_EDIT_ENDPOINT is not configured"
        else:
            model = self.model or "provider default"
            auth = "api_key=configured" if self.api_key else "api_key=not configured"
            self.reason = f"provider=custom_http, model={model}, endpoint={self.endpoint}, {auth}"

    def edit_product_replacement(
        self,
        original: Image.Image,
        product: Image.Image,
        edit_mask: Image.Image,
        prompt: str,
        work_dir: Path,
    ) -> ImageEditResult | None:
        if not self.available:
            return None

        original_rgba = original.convert("RGBA")
        mask_rgba = _alpha_mask(edit_mask, original_rgba.size)
        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "original_image": _image_data_url(original_rgba),
            "product_image": _image_data_url(product.convert("RGBA")),
            "mask_image": _image_data_url(mask_rgba),
            "width": original_rgba.width,
            "height": original_rgba.height,
            "size": f"{original_rgba.width}x{original_rgba.height}",
            "task": "product_person_replacement",
        }
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        response = requests.post(self.endpoint, headers=headers, json=payload, timeout=self.timeout)
        if not response.ok:
            raise RuntimeError(f"Custom image edit failed: HTTP {response.status_code}: {_short_body(response.text)}")
        data = response.json()
        image_bytes = _extract_image_bytes(data, timeout=self.timeout)
        decoded = Image.open(BytesIO(image_bytes)).convert("RGBA")
        if decoded.size != original_rgba.size:
            decoded = decoded.resize(original_rgba.size, Image.Resampling.LANCZOS)
        return ImageEditResult(image=decoded, detail=self.reason)


def build_image_edit_provider(settings: ThirdPartySettings) -> ImageEditProvider:
    if settings.image_edit_provider == "none":
        return DisabledImageEditProvider()
    if settings.image_edit_provider == "custom_http":
        return CustomHTTPImageEditProvider(settings)
    return OpenAIImagesEditProvider(settings)


def image_edit_provider_status(settings: ThirdPartySettings) -> dict[str, str | bool | None]:
    provider = build_image_edit_provider(settings)
    return {
        "provider": getattr(provider, "name", settings.image_edit_provider),
        "available": bool(getattr(provider, "available", False)),
        "detail": getattr(provider, "reason", ""),
    }


def _alpha_mask(mask: Image.Image, size: tuple[int, int]) -> Image.Image:
    alpha = mask.resize(size).convert("L").filter(ImageFilter.GaussianBlur(radius=2))
    rgba = Image.new("RGBA", size, (255, 255, 255, 0))
    rgba.putalpha(alpha)
    return rgba


def _pad_to_image_api_size(image: Image.Image, fill: tuple[int, int, int, int]) -> Image.Image:
    width, height = image.size
    padded_width = max(16, ((width + 15) // 16) * 16)
    padded_height = max(16, ((height + 15) // 16) * 16)
    if padded_width == width and padded_height == height:
        return image.convert("RGBA")
    padded = Image.new("RGBA", (padded_width, padded_height), fill)
    padded.alpha_composite(image.convert("RGBA"), (0, 0))
    return padded


def _image_data_url(image: Image.Image) -> str:
    buffer = BytesIO()
    image.convert("RGBA").save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _extract_image_bytes(payload: Any, timeout: float) -> bytes:
    candidates = list(_image_candidates(payload))
    for candidate in candidates:
        if isinstance(candidate, str) and candidate.strip():
            return _bytes_from_string(candidate.strip(), timeout)
        if isinstance(candidate, dict):
            for value in _image_candidates(candidate):
                if isinstance(value, str) and value.strip():
                    return _bytes_from_string(value.strip(), timeout)
    raise RuntimeError(f"Image edit response missing image data: {_short_body(str(payload))}")


def _image_candidates(payload: Any):
    if isinstance(payload, dict):
        for key in ("b64_json", "image_base64", "image", "url", "image_url"):
            value = payload.get(key)
            if value:
                yield value
        for key in ("data", "images", "output"):
            value = payload.get(key)
            if isinstance(value, list):
                for item in value:
                    yield item
            elif value:
                yield value
    elif isinstance(payload, list):
        for item in payload:
            yield item


def _bytes_from_string(value: str, timeout: float) -> bytes:
    if value.startswith("data:image/"):
        _, encoded = value.split(",", 1)
        return base64.b64decode(encoded)
    if value.startswith("http://") or value.startswith("https://"):
        response = requests.get(value, timeout=timeout)
        if not response.ok:
            raise RuntimeError(f"Image download failed: HTTP {response.status_code}: {_short_body(response.text)}")
        return response.content
    return base64.b64decode(value)


def _short_body(text: str, limit: int = 1000) -> str:
    cleaned = " ".join((text or "").split())
    return cleaned[:limit] + ("..." if len(cleaned) > limit else "")

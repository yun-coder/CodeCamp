"""OpenAI-compatible image edit provider.

Calls the ``/images/edits`` endpoint of an OpenAI-compatible base URL and
returns the harmonized full-canvas image.
"""
from __future__ import annotations

import base64
import logging
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image

from pixelforge.core.settings import PixelforgeSettings
from pixelforge.providers.base import ImageEditProvider

logger = logging.getLogger(__name__)


def _to_png_bytes(image: Image.Image) -> bytes:
    buf = BytesIO()
    image.convert("RGBA").save(buf, format="PNG")
    return buf.getvalue()


def _from_any_response(payload: dict) -> Image.Image | None:
    """Robustly extract an image from any of several response shapes."""
    if "b64_json" in payload and payload["b64_json"]:
        return Image.open(BytesIO(base64.b64decode(payload["b64_json"])))
    if "image_base64" in payload and payload["image_base64"]:
        return Image.open(BytesIO(base64.b64decode(payload["image_base64"])))
    if "image" in payload and payload["image"]:
        data = payload["image"]
        if isinstance(data, str) and data.startswith("data:"):
            data = data.split(",", 1)[1]
        return Image.open(BytesIO(base64.b64decode(data)))
    if "url" in payload and payload["url"]:
        resp = requests.get(payload["url"], timeout=60)
        resp.raise_for_status()
        return Image.open(BytesIO(resp.content))
    if "data" in payload and isinstance(payload["data"], list) and payload["data"]:
        return _from_any_response(payload["data"][0])
    if "images" in payload and isinstance(payload["images"], list) and payload["images"]:
        return _from_any_response(payload["images"][0])
    return None


class OpenAIImagesEditProvider:
    """OpenAI-compatible image edit provider.

    Posts ``original + reference + mask`` as multipart form-data to the
    ``/images/edits`` endpoint and parses the result.
    """

    name = "openai_images"

    def __init__(self, settings: PixelforgeSettings) -> None:
        cfg = settings.openai
        self.api_key = cfg.api_key
        self.base_url = cfg.base_url.rstrip("/")
        self.model = cfg.image_model
        self.quality = cfg.image_quality
        self.timeout = cfg.request_timeout
        self.enabled = cfg.image_edit_enabled
        self.available = bool(self.enabled and self.api_key)
        if not self.enabled:
            self.reason = "Image edit is disabled"
        elif not self.api_key:
            self.reason = "OPENAI_API_KEY is not configured"
        else:
            self.reason = (
                f"provider=openai_images, model={self.model}, base_url={self.base_url}"
            )

    def edit_product_replacement(
        self,
        *,
        original: Image.Image,
        reference: Image.Image,
        mask: Image.Image,
        prompt: str,
        work_dir: Path,
    ) -> Image.Image | None:
        if not self.available:
            return None
        url = f"{self.base_url}/images/edits"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        files = {
            "image": ("original.png", _to_png_bytes(original), "image/png"),
            "mask": ("mask.png", _to_png_bytes(mask.convert("L")), "image/png"),
        }
        data = {
            "model": self.model,
            "prompt": prompt,
            "quality": self.quality,
            "size": f"{original.width}x{original.height}",
        }
        try:
            response = requests.post(
                url, headers=headers, files=files, data=data, timeout=self.timeout
            )
            response.raise_for_status()
            payload = response.json()
            image = _from_any_response(payload)
            if image is not None and work_dir:
                work_dir.mkdir(parents=True, exist_ok=True)
                image.save(work_dir / "model_replacement_raw.png", format="PNG")
            return image
        except Exception as exc:
            logger.error("OpenAI images edit failed: %s", exc)
            self.reason = f"edit failed: {exc}"
            return None

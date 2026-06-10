"""Custom HTTP image edit provider.

A flexible adapter for gateways that don't speak the OpenAI
``/images/edits`` shape. The request body is JSON and contains the original
and product images as base64 data URLs.
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


def _to_data_url(image: Image.Image) -> str:
    buf = BytesIO()
    image.convert("RGBA").save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


class CustomHTTPImageEditProvider:
    name = "custom_http"

    def __init__(self, settings: PixelforgeSettings) -> None:
        cfg = settings.image_edit.custom
        self.endpoint = cfg.endpoint
        self.api_key = cfg.api_key
        self.model = cfg.model
        self.timeout = settings.openai.request_timeout
        self.available = bool(self.endpoint)
        if not self.endpoint:
            self.reason = "CUSTOM_IMAGE_EDIT_ENDPOINT is not configured"
        else:
            self.reason = f"provider=custom_http, endpoint={self.endpoint}"

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
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        width, height = original.size
        body = {
            "model": self.model or "custom-image-edit",
            "prompt": prompt,
            "original_image": _to_data_url(original),
            "product_image": _to_data_url(reference),
            "mask_image": _to_data_url(mask.convert("L")),
            "width": width,
            "height": height,
            "size": f"{width}x{height}",
            "task": "product_person_replacement",
        }
        try:
            response = requests.post(
                self.endpoint, headers=headers, json=body, timeout=self.timeout
            )
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            logger.error("Custom HTTP image edit failed: %s", exc)
            self.reason = f"edit failed: {exc}"
            return None

        # Reuse the same tolerant parser as openai_images
        from pixelforge.providers.edit.openai_images import _from_any_response

        image = _from_any_response(payload)
        if image is not None and work_dir:
            work_dir.mkdir(parents=True, exist_ok=True)
            image.save(work_dir / "model_replacement_raw.png", format="PNG")
        return image

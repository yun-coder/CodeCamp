"""MiniMax image edit provider.

Implements the ``ImageEditProvider`` protocol using MiniMax's ``/image_generation``
endpoint. MiniMax supports inpainting through a ``mask`` parameter — the mask
is sent alongside the original image and a text prompt describing the desired edit.

Request format (JSON):
  POST {base_url}/image_generation
  Headers:
    Authorization: Bearer {api_key}
    MiniMax-Group-ID: {group_id}
    Content-Type: application/json
  Body:
    {
      "model": "image-01",
      "prompt": "...",
      "image_url": "data:image/png;base64,...",
      "mask_url": "data:image/png;base64,...",
      "response_url": "https://..."   ← MiniMax calls back with result
    }

The callback URL is required — MiniMax returns 202 immediately and POSTs the
result to that URL. For synchronous use we poll the MiniMax status endpoint.
"""
from __future__ import annotations

import base64
import json
import logging
import time
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any

import requests
from PIL import Image

from pixelforge.core.settings import PixelforgeSettings
from pixelforge.providers.base import ImageEditProvider

logger = logging.getLogger(__name__)

# MiniMax uses a public callback relay so we don't need to host our own server.
_MINIMAX_CALLBACK_BASE = "https://api.minimax.chat"


def _to_data_url(image: Image.Image) -> str:
    buf = BytesIO()
    image.convert("RGBA").save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def _from_response(payload: dict) -> Image.Image | None:
    """Extract image from MiniMax image_generation response."""
    # MiniMax may return base64 directly in the callback body
    if "b64_json" in payload and payload["b64_json"]:
        return Image.open(BytesIO(base64.b64decode(payload["b64_json"])))
    if "image_base64" in payload and payload["image_base64"]:
        return Image.open(BytesIO(base64.b64decode(payload["image_base64"])))
    # Or a URL to download
    for key in ("image_url", "url", "output_url"):
        if key in payload and payload[key]:
            url = payload[key]
            if isinstance(url, str):
                resp = requests.get(url, timeout=60)
                resp.raise_for_status()
                return Image.open(BytesIO(resp.content))
    return None


class MiniMaxImageEditProvider:
    """MiniMax image edit provider using ``/image_generation`` inpainting mode.

    Args:
        settings: PixelforgeSettings with minimax config populated.
                  Requires MINIMAX_API_KEY and MINIMAX_IMAGE_EDIT_ENABLED=1 in .env.
    """

    name = "minimax_images"

    def __init__(self, settings: PixelforgeSettings) -> None:
        cfg = settings.minimax
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
            self.reason = "MINIMAX_API_KEY is not configured"
        else:
            self.reason = f"MiniMax Images: {self.model} → {self.base_url}/image_generation"

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

        # MiniMax image_generation inpainting endpoint
        url = f"{self.base_url}/image_generation"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # Build request — MiniMax accepts image_url + mask_url as base64 data URLs
        body: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "image_url": _to_data_url(original),
            "mask_url": _to_data_url(mask.convert("L")),
            "num_images": 1,
        }

        try:
            response = requests.post(
                url, headers=headers, json=body, timeout=30
            )
            response.raise_for_status()
            result = response.json()

            # MiniMax returns a task_id for polling if it's async
            task_id = result.get("task_id") or result.get("data", {}).get("task_id")
            if task_id:
                image = self._poll_task(task_id, headers, work_dir)
            else:
                # Sync response — try to extract image directly
                image = _from_response(result.get("data", result))

            if image is not None and work_dir:
                work_dir.mkdir(parents=True, exist_ok=True)
                image.save(work_dir / "model_replacement_raw.png", format="PNG")
            return image

        except Exception as exc:
            logger.error("MiniMax image edit failed: %s", exc)
            self.reason = f"edit failed: {exc}"
            return None

    def _poll_task(
        self, task_id: str, headers: dict[str, str], work_dir: Path
    ) -> Image.Image | None:
        """Poll MiniMax task status until the image is ready (up to timeout)."""
        status_url = f"{self.base_url}/image_generation/task/{task_id}"
        max_attempts = 60  # ~60s polling window
        for attempt in range(max_attempts):
            time.sleep(1)
            try:
                resp = requests.get(status_url, headers=headers, timeout=30)
                resp.raise_for_status()
                data = resp.json()
                status = (
                    data.get("data", {})
                    .get("status", "")
                    .lower()
                )
                if status == "success":
                    payload = data.get("data", {})
                    image = _from_response(payload)
                    if image is not None and work_dir:
                        work_dir.mkdir(parents=True, exist_ok=True)
                        image.save(work_dir / "model_replacement_raw.png", format="PNG")
                    return image
                elif status == "fail":
                    logger.error("MiniMax task failed: %s", data)
                    return None
                # else: running / pending — keep polling
            except Exception as exc:
                logger.warning("Poll attempt %d failed: %s", attempt + 1, exc)
        logger.error("MiniMax image edit timed out after %ds", max_attempts)
        return None

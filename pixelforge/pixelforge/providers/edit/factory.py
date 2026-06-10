"""Provider selector for image editing.

Workflows call :func:`build_image_edit_provider` to get a Protocol-conformant
provider based on the current settings. The returned object is one of
``MiniMaxImageEditProvider``, ``CustomHTTPImageEditProvider``, or
``DisabledImageEditProvider``.
"""
from __future__ import annotations

from pixelforge.core.settings import ImageEditConfig, PixelforgeSettings
from pixelforge.providers.base import ImageEditProvider
from pixelforge.providers.edit.custom_http import CustomHTTPImageEditProvider
from pixelforge.providers.edit.minimax_images import MiniMaxImageEditProvider
from pixelforge.providers.edit.none import DisabledImageEditProvider


def build_image_edit_provider(settings: PixelforgeSettings) -> ImageEditProvider:
    cfg: ImageEditConfig = settings.image_edit
    if cfg.provider == "minimax_images":
        return MiniMaxImageEditProvider(settings)
    if cfg.provider == "custom_http":
        return CustomHTTPImageEditProvider(settings)
    return DisabledImageEditProvider()


__all__ = ["build_image_edit_provider"]

"""Provider selector for generative repair."""
from __future__ import annotations

from pixelforge.core.settings import PixelforgeSettings
from pixelforge.providers.base import GenerativeRepairProvider
from pixelforge.providers.repair.none import DisabledRepairProvider
from pixelforge.providers.repair.opencv_convex_hull import (
    OpenCVConvexHullRepairProvider,
)


def build_repair_provider(settings: PixelforgeSettings) -> GenerativeRepairProvider:
    cfg = settings.repair
    if cfg.provider == "opencv_convex_hull":
        return OpenCVConvexHullRepairProvider()
    return DisabledRepairProvider()


__all__ = ["build_repair_provider"]

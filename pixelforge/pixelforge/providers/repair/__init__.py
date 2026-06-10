"""Generative repair providers (OpenCV convex hull fallback, FLUX Kontext, LaMa, ...)."""
from __future__ import annotations

# Phase 2 imports go here:
from .opencv_convex_hull import OpenCVConvexHullRepairProvider
from .none import DisabledRepairProvider

__all__ = [
    "OpenCVConvexHullRepairProvider",
    "DisabledRepairProvider",
]

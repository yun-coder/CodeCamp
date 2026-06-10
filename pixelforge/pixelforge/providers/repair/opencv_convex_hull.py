"""Heuristic ``GenerativeRepairProvider`` using OpenCV convex hull + morph.

This is the safe default — it never requires a GPU or an external model.
It rebuilds the foreground silhouette into a convex hull and fills the
resulting mask into a clean, transparent PNG.

Replace with FLUX Kontext, LaMa, or SD-Inpainting when those are wired up
(``providers/repair/custom_http_flux.py`` or similar).
"""
from __future__ import annotations

import logging
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from pixelforge.providers.base import GenerativeRepairProvider
from pixelforge.core.manifest_io import (
    bbox_from_mask,
    mask_to_binary,
    rgba_asset,
)

logger = logging.getLogger(__name__)


class OpenCVConvexHullRepairProvider:
    name = "opencv_convex_hull"
    available = True
    reason = "Heuristic convex-hull reconstruction. Always available."

    def repair(
        self,
        image: Image.Image,
        mask: Image.Image,
        prompt: str,
        *,
        work_dir: Path | None = None,
    ) -> Image.Image | None:
        arr = np.asarray(mask.convert("L"))
        if arr.sum() < 50:
            return None
        bin_mask = (arr > 128).astype("uint8") * 255
        contours, _ = cv2.findContours(bin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None
        biggest = max(contours, key=cv2.contourArea)
        hull = cv2.convexHull(biggest)
        hull_mask = np.zeros_like(bin_mask)
        cv2.fillConvexPoly(hull_mask, hull, 255)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
        hull_mask = cv2.morphologyEx(hull_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        hull_mask_img = Image.fromarray(hull_mask, "L")
        bbox = bbox_from_mask(hull_mask_img)
        if bbox is None:
            return None
        result = rgba_asset(image, hull_mask_img, bbox)
        if work_dir:
            work_dir.mkdir(parents=True, exist_ok=True)
            result.save(work_dir / "repair_convex_hull.png", format="PNG")
        return result

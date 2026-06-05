"""
Exports segmentation results to structured JSON, mask images, object crops,
and an overlay visualization.
"""

import json
import os
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np


class Exporter:
    """Handles writing segmentation results to disk."""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.masks_dir = os.path.join(output_dir, "masks")
        self.crops_dir = os.path.join(output_dir, "crops")
        os.makedirs(self.masks_dir, exist_ok=True)
        os.makedirs(self.crops_dir, exist_ok=True)

    # ── Public API ──────────────────────────────────────────────

    def export(
        self,
        image: np.ndarray,
        masks: List[Dict[str, Any]],
        mode: str,
    ) -> Dict[str, Any]:
        """Export results with mask dicts from AMG.

        Args:
            image: HWC RGB uint8 array.
            masks: List of mask dicts returned by SamAutomaticMaskGenerator.
            mode: 'auto', 'prompt', or 'box'.

        Returns:
            Structured result dict.
        """
        objects: List[Dict[str, Any]] = []

        for idx, m in enumerate(masks):
            mask_binary = self._ensure_binary(m["segmentation"])
            bbox_xywh = m.get("bbox", [0, 0, 0, 0])

            # Save individual mask
            mask_path = os.path.join(self.masks_dir, f"mask_{idx:03d}.png")
            cv2.imwrite(mask_path, mask_binary * 255)

            # Save cropped object (with alpha channel)
            crop_path = os.path.join(self.crops_dir, f"crop_{idx:03d}.png")
            self._save_crop(image, mask_binary, bbox_xywh, crop_path)

            score = m.get("predicted_iou", 0.0)
            if isinstance(score, (np.floating, float)):
                score = float(score)

            stability = m.get("stability_score", 0.0)
            if isinstance(stability, (np.floating, float)):
                stability = float(stability)

            point = m.get("point_coords", [[0, 0]])[0]
            if isinstance(point, np.ndarray):
                point = point.tolist()

            objects.append({
                "id": idx,
                "bbox": {
                    "x": int(bbox_xywh[0]),
                    "y": int(bbox_xywh[1]),
                    "w": int(bbox_xywh[2]),
                    "h": int(bbox_xywh[3]),
                },
                "area": int(m.get("area", 0)),
                "score": round(score, 4),
                "stability": round(stability, 4),
                "point": point,
                "mask_file": f"masks/mask_{idx:03d}.png",
                "crop_file": f"crops/crop_{idx:03d}.png",
            })

        result = {
            "image": {
                "path": "",
                "width": image.shape[1],
                "height": image.shape[0],
            },
            "mode": mode,
            "total_objects": len(objects),
            "objects": objects,
        }

        # Save overlay visualization
        overlay_path = os.path.join(self.output_dir, "overlay.png")
        self._save_overlay(image, masks, overlay_path)

        # Save JSON
        json_path = os.path.join(self.output_dir, "result.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        return result

    def export_from_masks(
        self,
        image: np.ndarray,
        masks: np.ndarray,
        scores: np.ndarray,
        mode: str,
    ) -> Dict[str, Any]:
        """Export results from raw numpy masks (for prompt/box modes).

        Args:
            image: HWC RGB uint8 array.
            masks: CxHxW binary mask array.
            scores: Array of C model-predicted quality scores.
            mode: 'prompt' or 'box'.

        Returns:
            Structured result dict.
        """
        wrapped: List[Dict[str, Any]] = []
        for i in range(masks.shape[0]):
            mask_bin = masks[i].astype(np.uint8)
            bbox = self._mask_to_bbox(mask_bin)
            wrapped.append({
                "segmentation": mask_bin,
                "bbox": bbox,
                "area": int(mask_bin.sum()),
                "predicted_iou": float(scores[i]),
                "stability_score": 0.0,
                "point_coords": [[0, 0]],
            })

        return self.export(image, wrapped, mode)

    # ── Internal helpers ────────────────────────────────────────

    @staticmethod
    def _ensure_binary(mask) -> np.ndarray:
        """Convert mask to uint8 binary (0/255)."""
        if isinstance(mask, dict):
            # RLE dict — this shouldn't normally happen with binary_mask mode
            return np.zeros((1, 1), dtype=np.uint8)
        mask = np.asarray(mask, dtype=np.uint8)
        if mask.max() == 1:
            mask = mask * 255
        return mask

    @staticmethod
    def _mask_to_bbox(mask: np.ndarray) -> List[int]:
        """Compute XYWH bbox from a binary mask."""
        rows = np.any(mask, axis=1)
        cols = np.any(mask, axis=0)
        if not rows.any():
            return [0, 0, 0, 0]
        ymin, ymax = np.where(rows)[0][[0, -1]]
        xmin, xmax = np.where(cols)[0][[0, -1]]
        return [int(xmin), int(ymin), int(xmax - xmin + 1), int(ymax - ymin + 1)]

    def _save_crop(
        self,
        image: np.ndarray,
        mask: np.ndarray,
        bbox: List[int],
        path: str,
    ):
        """Save the object cropped from the image with a transparent background."""
        x, y, w, h = bbox
        if w <= 0 or h <= 0:
            return

        # Ensure mask is 0/255
        mask_bin = (mask > 128).astype(np.uint8) * 255

        crop_img = image[y:y + h, x:x + w].copy()
        crop_mask = mask_bin[y:y + h, x:x + w]

        # BGRA: RGB channels + alpha from mask
        bgra = np.dstack([
            crop_img,
            crop_mask,
        ]).astype(np.uint8)

        cv2.imwrite(path, cv2.cvtColor(bgra, cv2.COLOR_RGBA2BGRA))

    def _save_overlay(
        self,
        image: np.ndarray,
        masks: List[Dict[str, Any]],
        path: str,
        alpha: float = 0.4,
    ):
        """Draw a semi-transparent overlay of all masks on the image."""
        overlay = image.copy()
        colors = self._generate_colors(len(masks))

        for idx, m in enumerate(masks):
            mask_bin = self._ensure_binary(m["segmentation"])
            mask_bool = mask_bin > 128
            color = colors[idx]
            overlay[mask_bool] = (
                overlay[mask_bool] * (1 - alpha) +
                np.array(color, dtype=np.uint8) * alpha
            ).astype(np.uint8)

            # Draw bbox
            bbox = m.get("bbox", [0, 0, 0, 0])
            x, y, w, h = bbox
            cv2.rectangle(overlay, (int(x), int(y)),
                          (int(x + w), int(y + h)), color, 2)

        cv2.imwrite(path, cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))

    @staticmethod
    def _generate_colors(n: int) -> List[Tuple[int, int, int]]:
        """Generate n visually distinct RGB colors."""
        colors = []
        for i in range(n):
            hue = i / max(n, 1)
            # Convert HSV -> RGB (simple HSV wheel)
            h = hue * 6
            c = 255
            x = int(c * (1 - abs(h % 2 - 1)))
            if h < 1:
                r, g, b = c, x, 0
            elif h < 2:
                r, g, b = x, c, 0
            elif h < 3:
                r, g, b = 0, c, x
            elif h < 4:
                r, g, b = 0, x, c
            elif h < 5:
                r, g, b = x, 0, c
            else:
                r, g, b = c, 0, x
            colors.append((r, g, b))
        return colors

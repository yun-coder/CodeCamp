"""Segment Anything (Meta) local segmenter — direct port of sam-agent-tool.

Supports four ``mode`` values matching the ``SegmentationProvider`` protocol:

* ``"auto"``   — automatic mask generation for the whole image
* ``"point"``  — click-driven segmentation
* ``"box"``    — bounding-box-driven segmentation
* ``"bbox"``   — for each GroundedObject, return a mask confined to its bbox

The model is loaded once at init time and reused for all calls. Lazy import
of ``segment_anything`` keeps the package importable when SAM is not
installed.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import cv2
import numpy as np
from PIL import Image

from pixelforge.core.settings import PixelforgeSettings
from pixelforge.providers.base import (
    GroundedObject,
    MaskResult,
    SegmentationMode,
    SegmentationProvider,
)

logger = logging.getLogger(__name__)


# ── Lazy SAM import ─────────────────────────────────────────────────
# We don't want pixelforge to *require* segment_anything at import time —
# the SAMProvider is a runtime feature, gated on whether the user installed
# the [sam] extra.

class _SAMImportError(ImportError):
    """Raised when SAM is used but the dependency is not installed."""


def _import_sam():
    try:
        from segment_anything import (
            SamAutomaticMaskGenerator,
            SamPredictor,
            sam_model_registry,
        )
    except ImportError as exc:
        raise _SAMImportError(
            "Segment Anything is not installed. Install with "
            "`pip install -e .[sam]` (or manually: "
            "`pip install git+https://github.com/facebookresearch/segment-anything.git`)."
        ) from exc
    return SamAutomaticMaskGenerator, SamPredictor, sam_model_registry


# ── Provider ────────────────────────────────────────────────────────

class SAMLocalSegmenter:
    """Wraps Meta's Segment Anything for the pixelforge SegmentationProvider
    protocol. The model is loaded once at init time.
    """

    name = "sam_local"
    VALID_MODEL_TYPES = {"vit_h", "vit_l", "vit_b", "default"}

    def __init__(self, settings: PixelforgeSettings) -> None:
        cfg = settings.sam
        self.checkpoint = cfg.checkpoint
        self.model_type = cfg.model_type
        self.device = cfg.device
        self._mask_generator: Any = None
        self._sam: Any = None

        if self.model_type not in self.VALID_MODEL_TYPES:
            self.available = False
            self.reason = (
                f"Unknown model_type '{self.model_type}'. "
                f"Must be one of {sorted(self.VALID_MODEL_TYPES)}."
            )
            return

        if not self.checkpoint or not os.path.exists(self.checkpoint):
            self.available = False
            self.reason = f"Checkpoint not found: {self.checkpoint}"
            return

        try:
            _, _, sam_model_registry = _import_sam()
        except _SAMImportError as exc:
            self.available = False
            self.reason = str(exc)
            return

        logger.info("Loading SAM model (%s) from %s", self.model_type, self.checkpoint)
        self._sam = sam_model_registry[self.model_type](checkpoint=self.checkpoint)
        self._sam.to(device=self.device)
        self.available = True
        self.reason = (
            f"checkpoint={os.path.basename(self.checkpoint)}, "
            f"model_type={self.model_type}, device={self.device}"
        )

    # ── Public API: matches SegmentationProvider ──────────────────
    def segment(
        self,
        image: Image.Image,
        objects: list[GroundedObject] | None = None,
        *,
        mode: SegmentationMode = "bbox",
        points: Iterable[tuple[int, int]] | None = None,
        box: tuple[int, int, int, int] | None = None,
        work_dir: Path | None = None,
    ) -> dict[str, MaskResult]:
        if not self.available:
            return {}
        if work_dir is None:
            work_dir = Path("./pixelforge_runs/_sam_tmp")
        work_dir.mkdir(parents=True, exist_ok=True)

        img_array = self._load_image(image)
        if mode == "auto":
            return self._segment_auto(img_array, work_dir)
        if mode == "point":
            if not points:
                raise ValueError("mode='point' requires points")
            return self._segment_point(img_array, list(points), work_dir)
        if mode == "box":
            if not box:
                raise ValueError("mode='box' requires box")
            return self._segment_box(img_array, box, work_dir)
        if mode == "bbox":
            return self._segment_bbox(img_array, objects or [], work_dir)
        raise ValueError(f"Unknown segmentation mode: {mode!r}")

    # ── Mode implementations ─────────────────────────────────────
    def _segment_auto(self, img_array: np.ndarray, work_dir: Path) -> dict[str, MaskResult]:
        from segment_anything import SamAutomaticMaskGenerator  # local import

        if self._mask_generator is None:
            self._mask_generator = SamAutomaticMaskGenerator(
                self._sam,
                points_per_side=32,
                pred_iou_thresh=0.88,
                stability_score_thresh=0.95,
                crop_n_layers=0,
                min_mask_region_area=0,
            )
        masks = self._mask_generator.generate(img_array)
        results: dict[str, MaskResult] = {}
        for i, m in enumerate(masks):
            obj_id = f"obj_{i:03d}"
            mask_path = work_dir / f"mask_{obj_id}.png"
            Image.fromarray((m["segmentation"].astype("uint8") * 255), "L").save(mask_path)
            results[obj_id] = MaskResult(
                object_id=obj_id,
                mask_path=mask_path,
                bbox=tuple(int(v) for v in m["bbox"]),  # type: ignore[arg-type]
                area=int(m["area"]),
                score=float(m.get("predicted_iou", 1.0)),
                mode="auto",
            )
        return results

    def _segment_point(
        self, img_array: np.ndarray, points: list[tuple[int, int]], work_dir: Path
    ) -> dict[str, MaskResult]:
        from segment_anything import SamPredictor  # local import

        predictor = SamPredictor(self._sam)
        predictor.set_image(img_array)
        points_arr = np.array(points, dtype=np.float32)
        labels_arr = np.array([1] * len(points), dtype=np.int32)
        masks, scores, _ = predictor.predict(
            point_coords=points_arr,
            point_labels=labels_arr,
            multimask_output=True,
        )
        results: dict[str, MaskResult] = {}
        for i, (mask, score) in enumerate(zip(masks, scores)):
            obj_id = f"point_{i:03d}"
            mask_path = work_dir / f"mask_{obj_id}.png"
            Image.fromarray((mask.astype("uint8") * 255), "L").save(mask_path)
            bbox = self._bbox_of_mask(mask)
            results[obj_id] = MaskResult(
                object_id=obj_id,
                mask_path=mask_path,
                bbox=bbox,
                area=int(mask.sum()),
                score=float(score),
                mode="point",
            )
        return results

    def _segment_box(
        self, img_array: np.ndarray, box: tuple[int, int, int, int], work_dir: Path
    ) -> dict[str, MaskResult]:
        from segment_anything import SamPredictor  # local import

        predictor = SamPredictor(self._sam)
        predictor.set_image(img_array)
        box_arr = np.array(box, dtype=np.float32)
        masks, scores, _ = predictor.predict(
            point_coords=None,
            point_labels=None,
            box=box_arr,
            multimask_output=False,
        )
        mask = masks[0]
        score = float(scores[0])
        mask_path = work_dir / f"mask_box.png"
        Image.fromarray((mask.astype("uint8") * 255), "L").save(mask_path)
        return {
            "box_000": MaskResult(
                object_id="box_000",
                mask_path=mask_path,
                bbox=self._bbox_of_mask(mask),
                area=int(mask.sum()),
                score=score,
                mode="box",
            )
        }

    def _segment_bbox(
        self,
        img_array: np.ndarray,
        objects: list[GroundedObject],
        work_dir: Path,
    ) -> dict[str, MaskResult]:
        from segment_anything import SamPredictor  # local import

        predictor = SamPredictor(self._sam)
        predictor.set_image(img_array)
        results: dict[str, MaskResult] = {}
        for obj in objects:
            x, y, w, h = obj.bbox
            if w <= 0 or h <= 0:
                continue
            box_arr = np.array([x, y, x + w, y + h], dtype=np.float32)
            masks, scores, _ = predictor.predict(
                point_coords=None,
                point_labels=None,
                box=box_arr,
                multimask_output=False,
            )
            mask = masks[0]
            score = float(scores[0])
            mask_path = work_dir / f"mask_{obj.id}.png"
            Image.fromarray((mask.astype("uint8") * 255), "L").save(mask_path)
            results[obj.id] = MaskResult(
                object_id=obj.id,
                mask_path=mask_path,
                bbox=self._bbox_of_mask(mask),
                area=int(mask.sum()),
                score=score,
                mode="bbox",
            )
        return results

    # ── Helpers ──────────────────────────────────────────────────
    @staticmethod
    def _load_image(image_or_path: Image.Image | str | Path) -> np.ndarray:
        if isinstance(image_or_path, Image.Image):
            return np.asarray(image_or_path.convert("RGB"))
        img = cv2.imread(str(image_or_path))
        if img is None:
            raise FileNotFoundError(f"Cannot load image: {image_or_path}")
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    @staticmethod
    def _bbox_of_mask(mask: np.ndarray) -> tuple[int, int, int, int]:
        ys, xs = np.where(mask)
        if xs.size == 0:
            return (0, 0, 0, 0)
        return (
            int(xs.min()),
            int(ys.min()),
            int(xs.max() - xs.min() + 1),
            int(ys.max() - ys.min() + 1),
        )


# Protocol self-check
_ = SegmentationProvider

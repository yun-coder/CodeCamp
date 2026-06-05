"""
Core segmentation engine wrapping SAM's SamAutomaticMaskGenerator and SamPredictor.
"""

import os
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

from segment_anything import (
    SamAutomaticMaskGenerator,
    SamPredictor,
    sam_model_registry,
)

from .exporter import Exporter


class SAMTool:
    """High-level wrapper around SAM for agent workflow segmentation tasks.

    Loads the model once at init, then supports repeated calls to
    auto_segment(), prompt_segment(), and box_segment().

    Usage:
        tool = SAMTool(checkpoint="sam_vit_b.pth", model_type="vit_b")
        result = tool.auto_segment("input.jpg", output_dir="output/")
    """

    VALID_MODEL_TYPES = {"vit_h", "vit_l", "vit_b", "default"}

    def __init__(
        self,
        checkpoint: str,
        model_type: str = "vit_b",
        device: str = "cpu",
    ):
        """
        Args:
            checkpoint: Path to the SAM model checkpoint (.pth file).
            model_type: One of 'vit_h', 'vit_l', 'vit_b', 'default'.
            device: 'cpu' or 'cuda'.
        """
        if model_type not in self.VALID_MODEL_TYPES:
            raise ValueError(
                f"Unknown model_type '{model_type}'. "
                f"Must be one of {sorted(self.VALID_MODEL_TYPES)}."
            )

        if not os.path.exists(checkpoint):
            raise FileNotFoundError(f"Checkpoint not found: {checkpoint}")

        self.checkpoint = checkpoint
        self.model_type = model_type
        self.device = device

        print(f"Loading SAM model ({model_type}) from {checkpoint} ...")
        self.sam = sam_model_registry[model_type](checkpoint=checkpoint)
        self.sam.to(device=device)
        print("Model loaded.")

        # Pre-build the automatic mask generator (reused across auto_segment calls)
        self._mask_generator: Optional[SamAutomaticMaskGenerator] = None

    def _get_mask_generator(self, **amg_kwargs) -> SamAutomaticMaskGenerator:
        """Get or create an automatic mask generator with optional overrides."""
        if self._mask_generator is None or amg_kwargs:
            defaults = {
                "points_per_side": 32,
                "pred_iou_thresh": 0.88,
                "stability_score_thresh": 0.95,
                "crop_n_layers": 0,
                "min_mask_region_area": 0,
            }
            defaults.update(amg_kwargs)
            self._mask_generator = SamAutomaticMaskGenerator(
                self.sam, **defaults
            )
        return self._mask_generator

    # ── Public API ──────────────────────────────────────────────

    def auto_segment(
        self,
        image: str,
        output_dir: str,
        **amg_kwargs,
    ) -> Dict[str, Any]:
        """Automatically segment all objects in an image.

        Args:
            image: Path to input image file.
            output_dir: Directory to write outputs (JSON, masks, crops, overlay).
            **amg_kwargs: Override default AMG parameters
                (points_per_side, pred_iou_thresh, etc.)

        Returns:
            Dict with keys: image (path/w/h), mode, total_objects, objects[].
        """
        img_array = self._load_image(image)
        generator = self._get_mask_generator(**amg_kwargs)
        masks = generator.generate(img_array)

        exporter = Exporter(output_dir)
        return exporter.export(img_array, masks, mode="auto")

    def prompt_segment(
        self,
        image: str,
        output_dir: str,
        points: List[Tuple[int, int]],
        labels: Optional[List[int]] = None,
        multimask_output: bool = True,
    ) -> Dict[str, Any]:
        """Segment objects indicated by point prompts.

        Args:
            image: Path to input image file.
            output_dir: Directory to write outputs.
            points: List of (x, y) pixel coordinates.
            labels: List of 1 (foreground) or 0 (background) for each point.
                    Defaults to all 1 (foreground).
            multimask_output: If True, returns 3 candidate masks per prompt.

        Returns:
            Dict with structured result.
        """
        if labels is None:
            labels = [1] * len(points)

        points_arr = np.array(points, dtype=np.float32)
        labels_arr = np.array(labels, dtype=np.int32)

        img_array = self._load_image(image)
        predictor = SamPredictor(self.sam)
        predictor.set_image(img_array)

        masks, scores, _ = predictor.predict(
            point_coords=points_arr,
            point_labels=labels_arr,
            multimask_output=multimask_output,
        )

        exporter = Exporter(output_dir)
        return exporter.export_from_masks(
            img_array, masks, scores, mode="prompt"
        )

    def box_segment(
        self,
        image: str,
        output_dir: str,
        box: Tuple[int, int, int, int],
        multimask_output: bool = False,
    ) -> Dict[str, Any]:
        """Segment the object inside a bounding box.

        Args:
            image: Path to input image file.
            output_dir: Directory to write outputs.
            box: (x1, y1, x2, y2) in pixel coordinates (xyxy format).
            multimask_output: If True, returns 3 candidate masks.

        Returns:
            Dict with structured result.
        """
        box_arr = np.array(box, dtype=np.float32)

        img_array = self._load_image(image)
        predictor = SamPredictor(self.sam)
        predictor.set_image(img_array)

        masks, scores, _ = predictor.predict(
            point_coords=None,
            point_labels=None,
            box=box_arr,
            multimask_output=multimask_output,
        )

        exporter = Exporter(output_dir)
        return exporter.export_from_masks(
            img_array, masks, scores, mode="box"
        )

    # ── Helpers ─────────────────────────────────────────────────

    @staticmethod
    def _load_image(path: str) -> np.ndarray:
        """Load an image from path, returning an HWC RGB uint8 array."""
        img = cv2.imread(path)
        if img is None:
            raise FileNotFoundError(f"Cannot load image: {path}")
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

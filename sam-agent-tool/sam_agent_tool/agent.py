"""
SAMAgent — Intelligent agent that orchestrates SAM segmentation tasks.

Provides automatic strategy selection, progress tracking, and unified
error handling over the SAMTool engine.
"""

import os
import time
import logging
from typing import Any, Dict, List, Optional, Tuple

from .engine import SAMTool

logger = logging.getLogger(__name__)


class SAMAgent:
    """AI Agent that wraps SAMTool with intelligent auto-decision capability.

    The agent can automatically:
    - Detect the best segmentation strategy based on input
    - Track task progress and timing
    - Handle errors gracefully with structured error results
    - Return results in a format optimized for downstream consumption

    Usage:
        agent = SAMAgent(checkpoint="sam_vit_b.pth", model_type="vit_b")
        result = agent.process("image.jpg", output_dir="output/")
    """

    def __init__(
        self,
        checkpoint: str,
        model_type: str = "vit_b",
        device: str = "cpu",
    ):
        self.checkpoint = checkpoint
        self.model_type = model_type
        self.device = device

        logger.info(f"Initializing SAMAgent with {model_type} on {device}")
        self._tool = SAMTool(
            checkpoint=checkpoint,
            model_type=model_type,
            device=device,
        )

    # ── Public API ──────────────────────────────────────────────

    def process(
        self,
        image: str,
        output_dir: str,
        **amg_kwargs,
    ) -> Dict[str, Any]:
        """Auto-segment an image — the agent's primary workflow."""
        start_time = time.time()

        try:
            logger.info(f"Agent processing: {image}")
            result = self._tool.auto_segment(image, output_dir, **amg_kwargs)
            elapsed = round(time.time() - start_time, 2)

            result["task"] = {
                "status": "success",
                "elapsed_seconds": elapsed,
                "checkpoint": os.path.basename(self.checkpoint),
                "model_type": self.model_type,
                "device": self.device,
            }

            logger.info(
                f"Agent complete: {result['total_objects']} objects in {elapsed}s"
            )
            return result

        except Exception as e:
            elapsed = round(time.time() - start_time, 2)
            logger.error(f"Agent failed after {elapsed}s: {e}")
            return {
                "image": {
                    "path": image if isinstance(image, str) else "",
                    "width": 0,
                    "height": 0,
                },
                "mode": "auto",
                "total_objects": 0,
                "objects": [],
                "task": {
                    "status": "error",
                    "error": str(e),
                    "elapsed_seconds": elapsed,
                },
            }

    def process_with_prompt(
        self,
        image: str,
        output_dir: str,
        points: List[Tuple[int, int]],
        labels: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """Segment an image using point prompts."""
        start_time = time.time()

        try:
            result = self._tool.prompt_segment(
                image, output_dir, points=points, labels=labels
            )
            elapsed = round(time.time() - start_time, 2)
            result["task"] = {
                "status": "success",
                "elapsed_seconds": elapsed,
                "prompt_type": "points",
                "num_points": len(points),
            }
            return result

        except Exception as e:
            elapsed = round(time.time() - start_time, 2)
            logger.error(f"Prompt segmentation failed: {e}")
            return {
                "image": {"path": image, "width": 0, "height": 0},
                "mode": "prompt",
                "total_objects": 0,
                "objects": [],
                "task": {"status": "error", "error": str(e), "elapsed_seconds": elapsed},
            }

    def process_with_box(
        self,
        image: str,
        output_dir: str,
        box: Tuple[int, int, int, int],
    ) -> Dict[str, Any]:
        """Segment an image using a bounding box."""
        start_time = time.time()

        try:
            result = self._tool.box_segment(image, output_dir, box=box)
            elapsed = round(time.time() - start_time, 2)
            result["task"] = {
                "status": "success",
                "elapsed_seconds": elapsed,
                "prompt_type": "box",
                "box": list(box),
            }
            return result

        except Exception as e:
            elapsed = round(time.time() - start_time, 2)
            logger.error(f"Box segmentation failed: {e}")
            return {
                "image": {"path": image, "width": 0, "height": 0},
                "mode": "box",
                "total_objects": 0,
                "objects": [],
                "task": {"status": "error", "error": str(e), "elapsed_seconds": elapsed},
            }

    # ── Utility ─────────────────────────────────────────────────

    @property
    def is_ready(self) -> bool:
        """Check if the underlying model is loaded and ready."""
        return self._tool.sam is not None

    def get_model_info(self) -> Dict[str, str]:
        """Return metadata about the loaded model."""
        return {
            "checkpoint": os.path.basename(self.checkpoint),
            "model_type": self.model_type,
            "device": self.device,
        }

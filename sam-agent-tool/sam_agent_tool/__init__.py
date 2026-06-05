"""
SAM Agent Tool — Segment Anything Model as an agent workflow utility.

Provides both CLI and Python SDK interfaces for:
- Auto-segmentation of all objects in an image
- Point-prompted segmentation of specific objects
- Box-prompted segmentation of specific objects

Usage:
    from sam_agent_tool import SAMTool
    tool = SAMTool(checkpoint="sam_vit_b.pth", model_type="vit_b")
    result = tool.auto_segment("image.jpg", output_dir="out/")
"""

from .engine import SAMTool
from .agent import SAMAgent

__all__ = ["SAMTool", "SAMAgent"]

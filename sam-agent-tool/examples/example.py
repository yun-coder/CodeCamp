"""
Example: Using SAM Agent Tool as a Python SDK.

Usage:
    python examples/example.py
"""

import os
import sys

# Allow running from the project root without installing
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sam_agent_tool import SAMTool

# ── Configuration ──────────────────────────────────────────
CHECKPOINT = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "..", "segment-anything", "sam_vit_b_01ec64.pth"
)
CHECKPOINT = os.path.abspath(CHECKPOINT)

IMAGE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "..", "segment-anything", "notebooks", "images", "truck.jpg"
)
IMAGE = os.path.abspath(IMAGE)

OUTPUT_DIR = "example_output"
# ────────────────────────────────────────────────────────────


def main():
    # Check prerequisites
    if not os.path.exists(CHECKPOINT):
        print(f"Model checkpoint not found: {CHECKPOINT}")
        print("Download a checkpoint first, e.g.:")
        print("  https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth")
        return

    if not os.path.exists(IMAGE):
        print(f"Example image not found: {IMAGE}")
        return

    # Initialize — model loads once
    tool = SAMTool(checkpoint=CHECKPOINT, model_type="vit_b", device="cpu")

    # ── 1. Auto-segment everything ──
    print("\n=== Auto Segmentation ===")
    result = tool.auto_segment(IMAGE, os.path.join(OUTPUT_DIR, "auto"))
    print(f"Found {result['total_objects']} objects")
    for obj in result["objects"][:5]:
        print(f"  [{obj['id']}] bbox={obj['bbox']} area={obj['area']} score={obj['score']}")

    # ── 2. Prompt-segment with a point ──
    print("\n=== Point Prompt Segmentation ===")
    result = tool.prompt_segment(
        IMAGE,
        os.path.join(OUTPUT_DIR, "prompt"),
        points=[(500, 375)],
    )
    print(f"Found {result['total_objects']} object(s)")
    for obj in result["objects"]:
        print(f"  [{obj['id']}] score={obj['score']}")

    # ── 3. Box-segment ──
    print("\n=== Box Prompt Segmentation ===")
    result = tool.box_segment(
        IMAGE,
        os.path.join(OUTPUT_DIR, "box"),
        box=(425, 600, 700, 875),
    )
    print(f"Found {result['total_objects']} object(s)")
    for obj in result["objects"]:
        print(f"  [{obj['id']}] bbox={obj['bbox']}")

    print(f"\nAll outputs saved to: {os.path.abspath(OUTPUT_DIR)}/")


if __name__ == "__main__":
    main()

"""
CLI entry point for SAM Agent Tool.

Usage:
    python -m sam_agent_tool auto --input <img> --output <dir> --checkpoint <path>
    python -m sam_agent_tool prompt --input <img> --output <dir> --checkpoint <path> --points "x,y"
    python -m sam_agent_tool box --input <img> --output <dir> --checkpoint <path> --box "x1,y1,x2,y2"
"""

import argparse
import os
import sys

from .engine import SAMTool


def _parse_point_arg(s: str):
    """Parse 'x,y' or 'x,y;x2,y2' into list of tuples."""
    points = []
    for part in s.split(";"):
        x, y = part.strip().split(",")
        points.append((int(x.strip()), int(y.strip())))
    return points


def _parse_box_arg(s: str):
    """Parse 'x1,y1,x2,y2' into a tuple of 4 ints."""
    parts = s.split(",")
    return tuple(int(p.strip()) for p in parts)


def _collect_images(path: str):
    """Collect image file paths from a single file or directory."""
    if os.path.isfile(path):
        return [path]
    if os.path.isdir(path):
        exts = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}
        files = []
        for f in sorted(os.listdir(path)):
            if os.path.splitext(f)[1].lower() in exts:
                files.append(os.path.join(path, f))
        return files
    raise FileNotFoundError(f"Input path not found: {path}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="SAM Agent Tool — segment anything from the command line."
    )
    sub = parser.add_subparsers(dest="mode", required=True)

    # Shared args
    def add_shared(p):
        p.add_argument("--input", "-i", required=True,
                       help="Path to image file or directory of images.")
        p.add_argument("--output", "-o", required=True,
                       help="Directory to save results.")
        p.add_argument("--checkpoint", "-c", required=True,
                       help="Path to SAM model checkpoint (.pth).")
        p.add_argument("--model-type", "-m", default="vit_b",
                       choices=["vit_h", "vit_l", "vit_b", "default"],
                       help="SAM model architecture (default: vit_b).")
        p.add_argument("--device", "-d", default="cpu",
                       help="Device to run on (cpu or cuda, default: cpu).")

    # auto subcommand
    p_auto = sub.add_parser("auto", help="Auto-segment all objects in image(s).")
    add_shared(p_auto)
    p_auto.add_argument("--points-per-side", type=int, default=32)
    p_auto.add_argument("--pred-iou-thresh", type=float, default=0.88)
    p_auto.add_argument("--stability-score-thresh", type=float, default=0.95)

    # prompt subcommand
    p_prompt = sub.add_parser("prompt", help="Segment objects using point prompts.")
    add_shared(p_prompt)
    p_prompt.add_argument("--points", "-p", required=True,
                          help="Point coordinates, e.g. '500,375' or '500,375;600,400'.")

    # box subcommand
    p_box = sub.add_parser("box", help="Segment object inside a bounding box.")
    add_shared(p_box)
    p_box.add_argument("--box", "-b", required=True,
                       help="Box in xyxy format: 'x1,y1,x2,y2'.")

    # web subcommand
    p_web = sub.add_parser("web", help="Start the Web UI server.")
    p_web.add_argument("--checkpoint", "-c", required=True,
                       help="Path to SAM model checkpoint (.pth).")
    p_web.add_argument("--model-type", "-m", default="vit_b",
                       choices=["vit_h", "vit_l", "vit_b", "default"],
                       help="SAM model architecture (default: vit_b).")
    p_web.add_argument("--device", "-d", default="cpu",
                       help="Device to run on (cpu or cuda, default: cpu).")
    p_web.add_argument("--host", default="0.0.0.0",
                       help="Server host (default: 0.0.0.0).")
    p_web.add_argument("--port", "-p", type=int, default=8080,
                       help="Server port (default: 8080).")

    return parser


def main(args=None):
    parser = build_parser()
    opts = parser.parse_args(args)

    # Web mode — handled separately (no image input needed)
    if opts.mode == "web":
        from .web import run_server
        run_server(
            checkpoint=opts.checkpoint,
            model_type=opts.model_type,
            device=opts.device,
            host=opts.host,
            port=opts.port,
        )
        return

    # Segmentation modes — need model + images
    tool = SAMTool(
        checkpoint=opts.checkpoint,
        model_type=opts.model_type,
        device=opts.device,
    )

    images = _collect_images(opts.input)
    print(f"Found {len(images)} image(s) to process.")

    for img_path in images:
        base = os.path.splitext(os.path.basename(img_path))[0]
        out_dir = os.path.join(opts.output, base)
        print(f"\nProcessing: {img_path} -> {out_dir}")

        if opts.mode == "auto":
            result = tool.auto_segment(
                img_path, out_dir,
                points_per_side=opts.points_per_side,
                pred_iou_thresh=opts.pred_iou_thresh,
                stability_score_thresh=opts.stability_score_thresh,
            )
        elif opts.mode == "prompt":
            points = _parse_point_arg(opts.points)
            result = tool.prompt_segment(img_path, out_dir, points=points)
        elif opts.mode == "box":
            box = _parse_box_arg(opts.box)
            result = tool.box_segment(img_path, out_dir, box=box)
        else:
            parser.print_help()
            sys.exit(1)

        print(f"  -> {result['total_objects']} objects found.")
        print(f"  -> Results saved to {out_dir}/")

    print("\nDone.")


if __name__ == "__main__":
    main()

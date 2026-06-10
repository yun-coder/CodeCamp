"""``pixelforge segment {auto,point,box}`` — SAM segmentation CLI."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def run_segment_cli(args: argparse.Namespace) -> int:
    from pixelforge.core.settings import PixelforgeSettings
    from pixelforge.providers.segment.sam_local import SAMLocalSegmenter

    settings = PixelforgeSettings()
    if args.checkpoint:
        settings.sam.checkpoint = args.checkpoint
    if args.model_type:
        settings.sam.model_type = args.model_type
    if args.device:
        settings.sam.device = args.device

    seg = SAMLocalSegmenter(settings)
    if not seg.available:
        print(f"❌ SAM unavailable: {seg.reason}", file=sys.stderr)
        return 2

    work_dir = Path(args.output)
    work_dir.mkdir(parents=True, exist_ok=True)

    points: list[tuple[int, int]] | None = None
    box: tuple[int, int, int, int] | None = None
    if args.mode == "point":
        try:
            points = [
                (int(p.split(",")[0]), int(p.split(",")[1]))
                for p in args.points.replace(",", ";").split(";") if p.strip()
            ]
        except (ValueError, IndexError) as exc:
            print(f"❌ Invalid --points: {args.points} ({exc})", file=sys.stderr)
            return 2
    elif args.mode == "box":
        try:
            box = tuple(int(v) for v in args.box.split(","))  # type: ignore[assignment]
        except ValueError as exc:
            print(f"❌ Invalid --box: {args.box} ({exc})", file=sys.stderr)
            return 2

    from PIL import Image
    try:
        image = Image.open(args.image)
    except Exception as exc:
        print(f"❌ Cannot open {args.image}: {exc}", file=sys.stderr)
        return 2

    results = seg.segment(image, mode=args.mode, points=points, box=box, work_dir=work_dir)
    out_json = work_dir / "result.json"
    out_json.write_text(
        json.dumps(
            {
                "mode": args.mode,
                "total_objects": len(results),
                "objects": [
                    {
                        "id": r.object_id,
                        "bbox": list(r.bbox),
                        "area": r.area,
                        "score": r.score,
                        "mask_path": str(r.mask_path),
                    }
                    for r in results.values()
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"✓ {len(results)} object(s) → {out_json}")
    return 0

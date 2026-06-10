"""``pixelforge analyze`` — layer-analysis CLI."""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def run_analyze_cli(args: argparse.Namespace) -> int:
    from pixelforge.core.settings import PixelforgeSettings
    from pixelforge.core.storage import ProjectStorage
    from pixelforge.providers.registry import build_provider_registry
    from pixelforge.workflows.layer_analysis import LayerAnalysisWorkflow

    settings = PixelforgeSettings()
    if args.output:
        settings.output_dir = args.output

    storage = ProjectStorage(settings.output_dir)
    pid = storage.create_project()
    src = Path(args.image)
    if not src.exists():
        print(f"❌ {args.image} not found", file=sys.stderr)
        return 2
    shutil.copy(src, storage.original_path(pid))
    print(f"→ project {pid} created at {storage.project_dir(pid)}")

    registry = build_provider_registry(settings)
    workflow = LayerAnalysisWorkflow(max_text_regions=args.max_text_regions)
    try:
        manifest = workflow.run(storage, pid, registry)
    except Exception as exc:
        print(f"❌ analyze failed: {exc}", file=sys.stderr)
        return 1
    print(f"✓ {len(manifest.layers)} layers produced")
    print(f"  summary: {manifest.summary}")
    if manifest.warnings:
        print(f"  warnings ({len(manifest.warnings)}):")
        for w in manifest.warnings[:5]:
            print(f"    - {w}")
    return 0

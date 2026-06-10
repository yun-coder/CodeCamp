"""``pixelforge replace`` — xiaohua replacement CLI."""
from __future__ import annotations

import argparse
import sys


def run_replace_cli(args: argparse.Namespace) -> int:
    from pixelforge.core.settings import PixelforgeSettings
    from pixelforge.core.storage import ProjectStorage
    from pixelforge.providers.registry import build_provider_registry
    from pixelforge.workflows.xiaohua_replacement import XiaohuaReplacementWorkflow

    settings = PixelforgeSettings()
    storage = ProjectStorage(args.output)
    try:
        storage.require_project_dir(args.project_id)
    except FileNotFoundError as exc:
        print(f"❌ {exc}", file=sys.stderr)
        return 2

    registry = build_provider_registry(settings)
    try:
        replacement = XiaohuaReplacementWorkflow().run(
            storage, args.project_id, registry,
            options={"compose": not args.no_compose},
        )
    except Exception as exc:
        print(f"❌ replacement failed: {exc}", file=sys.stderr)
        return 1
    print(f"✓ replacement built: {len(replacement.target_regions)} target region(s)")
    if replacement.result_url:
        print(f"  result: {replacement.result_url}")
    if replacement.warnings:
        print(f"  warnings ({len(replacement.warnings)}):")
        for w in replacement.warnings[:5]:
            print(f"    - {w}")
    return 0

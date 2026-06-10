"""Command-line interface: `python -m pixelforge ...`.

Phase 5 ships:

* ``pixelforge``  — top-level dispatcher (registered as console script)
* ``pixelforge segment {auto,point,box}`` — SAM segmentation CLI
* ``pixelforge analyze`` — layer-analysis CLI
* ``pixelforge replace`` — xiaohua replacement CLI
* ``pixelforge providers`` — list configured providers + availability
* ``pixelforge settings`` — show effective configuration (secrets redacted)
* ``pixelforge serve`` — start the FastAPI Web UI
"""
from __future__ import annotations

import argparse
import sys
from typing import Sequence


def build_parser() -> argparse.ArgumentParser:
    """Build the top-level argument parser with subcommands."""
    parser = argparse.ArgumentParser(
        prog="pixelforge",
        description=(
            "Pixel-level image understanding + editing workflow engine. "
            "Subcommands: segment, analyze, replace, providers, settings, serve."
        ),
    )
    parser.add_argument("--version", action="store_true", help="Print version and exit.")
    sub = parser.add_subparsers(dest="cmd", metavar="<command>")

    # segment
    seg = sub.add_parser("segment", help="Run SAM segmentation on an image.")
    seg_mode = seg.add_subparsers(dest="mode", metavar="<mode>")
    seg_mode.add_parser("auto", help="Auto-segment every salient object.")
    p_prompt = seg_mode.add_parser("point", help="Segment at one or more pixel points.")
    p_prompt.add_argument("--points", required=True, help='Comma/semicolon list of "x,y" pairs.')
    p_box = seg_mode.add_parser("box", help="Segment inside an xyxy bounding box.")
    p_box.add_argument("--box", required=True, help='"x1,y1,x2,y2"')
    for sub_p in (seg_mode.choices and [seg_mode.choices["auto"], p_prompt, p_box] or []):
        pass
    for m in seg_mode.choices.values():
        m.add_argument("-i", "--image", required=True, help="Input image path.")
        m.add_argument("-o", "--output", default="./pixelforge_segment_out", help="Output directory.")
        m.add_argument("-c", "--checkpoint", default=None, help="SAM checkpoint path (overrides SAM_CHECKPOINT env).")
        m.add_argument("--model-type", default=None, help="SAM model type: vit_b | vit_l | vit_h.")
        m.add_argument("--device", default=None, help="cpu | cuda")

    # analyze
    a = sub.add_parser("analyze", help="Run the layer-analysis workflow on an image.")
    a.add_argument("-i", "--image", required=True, help="Input image path.")
    a.add_argument("-o", "--output", default="./pixelforge_runs", help="Project output root.")
    a.add_argument("--max-text-regions", type=int, default=12)

    # replace
    r = sub.add_parser("replace", help="Run the xiaohua replacement workflow.")
    r.add_argument("--project-id", required=True, help="Existing project id to operate on.")
    r.add_argument("-o", "--output", default="./pixelforge_runs", help="Project output root.")
    r.add_argument("--no-compose", action="store_true", help="Skip the final image-edit call.")

    # providers
    sub.add_parser("providers", help="List configured providers and their availability.")

    # settings
    sub.add_parser("settings", help="Show effective configuration (secrets redacted).")

    # serve
    s = sub.add_parser("serve", help="Start the FastAPI Web UI (default port 8700).")
    s.add_argument("--host", default="127.0.0.1")
    s.add_argument("--port", type=int, default=None)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.version:
        from pixelforge import __version__
        print(f"pixelforge {__version__}")
        return 0

    if not args.cmd:
        parser.print_help()
        return 0

    if args.cmd == "segment":
        return _cmd_segment(args)
    if args.cmd == "analyze":
        return _cmd_analyze(args)
    if args.cmd == "replace":
        return _cmd_replace(args)
    if args.cmd == "providers":
        return _cmd_providers(args)
    if args.cmd == "settings":
        return _cmd_settings(args)
    if args.cmd == "serve":
        return _cmd_serve(args)

    parser.print_help()
    return 1


# ── Subcommand implementations ──────────────────────────────────────

def _cmd_segment(args: argparse.Namespace) -> int:
    """Delegate to ``pixelforge.cli.commands.segment``. Imported lazily so
    importing ``pixelforge.cli`` doesn't pull in torch (which is only
    needed when actually running a segmentation command).
    """
    from pixelforge.cli.commands.segment import run_segment_cli
    return run_segment_cli(args)


def _cmd_analyze(args: argparse.Namespace) -> int:
    from pixelforge.cli.commands.analyze import run_analyze_cli
    return run_analyze_cli(args)


def _cmd_replace(args: argparse.Namespace) -> int:
    from pixelforge.cli.commands.replace import run_replace_cli
    return run_replace_cli(args)


def _cmd_providers(args: argparse.Namespace) -> int:
    from pixelforge.cli.commands.providers import run_providers_cli
    return run_providers_cli(args)


def _cmd_settings(args: argparse.Namespace) -> int:
    from pixelforge.cli.commands.settings import run_settings_cli
    return run_settings_cli(args)


def _cmd_serve(args: argparse.Namespace) -> int:
    import uvicorn
    from pixelforge.api.main import app
    from pixelforge.core.settings import PixelforgeSettings

    settings = PixelforgeSettings()
    host = args.host
    port = args.port or settings.port
    print(f"Starting pixelforge Web UI at http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level=settings.log_level.lower())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Entry point for PyInstaller-packaged backend (and dev mode).

Usage:
    python run_backend.py --port 8000 --static-dir ../frontend/dist
    python run_backend.py --port 8000

In dev mode, --static-dir is optional. The Electron app sets
PROJECT_HELPER_STATIC_DIR and PROJECT_HELPER_PORT via env vars.
"""

from __future__ import annotations

import argparse
import os
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="project-helper backend")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    parser.add_argument(
        "--static-dir",
        type=str,
        default=None,
        help="Path to frontend static files (dist directory)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    # Pass config via env vars so app.main reads them at import time
    os.environ["PROJECT_HELPER_PORT"] = str(args.port)
    if args.static_dir:
        os.environ["PROJECT_HELPER_STATIC_DIR"] = args.static_dir

    from app.main import app
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")

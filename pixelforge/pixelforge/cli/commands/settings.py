"""``pixelforge settings`` — show effective configuration (secrets redacted)."""
from __future__ import annotations

import argparse
import json


def run_settings_cli(args: argparse.Namespace) -> int:  # noqa: ARG001
    from pixelforge.api.routes.settings import _scrub
    from pixelforge.core.settings import PixelforgeSettings

    settings = PixelforgeSettings()
    print(json.dumps(_scrub(settings), indent=2, ensure_ascii=False))
    return 0

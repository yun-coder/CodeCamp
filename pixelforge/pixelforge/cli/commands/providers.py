"""``pixelforge providers`` — list configured providers + availability."""
from __future__ import annotations

import argparse


def run_providers_cli(args: argparse.Namespace) -> int:  # noqa: ARG001
    from pixelforge.core.settings import PixelforgeSettings
    from pixelforge.providers.registry import build_provider_registry

    settings = PixelforgeSettings()
    registry = build_provider_registry(settings)
    print("Configured providers:")
    for name, info in registry.details.items():
        marker = "✓" if info["available"] == "True" else "✗"
        print(f"  {marker} {name:<14} {info['provider']:<22} {info['reason']}")
    return 0

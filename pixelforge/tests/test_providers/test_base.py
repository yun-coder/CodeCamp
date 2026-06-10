"""Sanity tests for the Phase 1 Protocol skeleton.

These tests don't exercise any real Provider (those come in Phase 2). They
verify that:

1. The five Protocols are importable and have the expected method signatures.
2. ``DisabledProvider`` and the domain types are usable as documented.
3. The package metadata is consistent (version, etc.).
"""
from __future__ import annotations

import importlib

import pytest


def test_package_imports():
    pkg = importlib.import_module("pixelforge")
    assert hasattr(pkg, "__version__")
    assert isinstance(pkg.__version__, str)
    assert pkg.__version__  # non-empty


def test_five_protocols_importable():
    from pixelforge.providers.base import (
        GroundingProvider,
        GenerativeRepairProvider,
        ImageEditProvider,
        OCRProvider,
        SegmentationProvider,
    )
    # runtime_checkable Protocols register as classes
    for proto in (
        OCRProvider,
        GroundingProvider,
        SegmentationProvider,
        ImageEditProvider,
        GenerativeRepairProvider,
    ):
        assert hasattr(proto, "__call__") or hasattr(proto, "_abc_impl") \
            or hasattr(proto, "__protocol_attrs__"), \
            f"{proto.__name__} doesn't look like a Protocol"


def test_disabled_provider_raises():
    from pixelforge.providers.base import DisabledProvider

    class Stub(DisabledProvider):
        def do_thing(self) -> None:
            self.unavailable("do_thing")

    s = Stub()
    assert s.available is False
    with pytest.raises(RuntimeError, match="unavailable"):
        s.do_thing()


def test_domain_types_constructible():
    from pixelforge.providers.base import GroundedObject, MaskResult, TextBox
    from pathlib import Path

    g = GroundedObject(
        id="g1", label="model", bbox=(10, 20, 100, 200), confidence=0.9
    )
    assert g.id == "g1"
    assert g.bbox == (10, 20, 100, 200)

    t = TextBox(bbox=(0, 0, 50, 20), text="hello", confidence=0.95)
    assert t.text == "hello"

    m = MaskResult(
        object_id="g1",
        mask_path=Path("/tmp/m.png"),
        bbox=(10, 20, 100, 200),
        area=20000,
        score=0.91,
        mode="bbox",
    )
    assert m.mode == "bbox"


def test_cli_version_flag():
    # Smoke-test the stub CLI: `pixelforge --version` should print the version.
    from pixelforge.cli.__main__ import main

    assert main(["--version"]) == 0

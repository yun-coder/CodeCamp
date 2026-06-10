"""Segmentation providers (SAM local, SAM2, ...)."""
from __future__ import annotations

# Phase 2 imports go here:
from .sam_local import SAMLocalSegmenter

__all__ = ["SAMLocalSegmenter"]

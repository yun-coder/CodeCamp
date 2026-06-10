"""Core domain types (Project, ImageManifest, GroundedObject helpers, ...)."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

# Re-export provider base types so callers have a single import path
from pixelforge.providers.base import (  # noqa: F401
    GroundedObject,
    TextBox,
    MaskResult,
    SegmentationMode,
)


# ── Bounding-box helpers ─────────────────────────────────────────────

def bbox_iou(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
    """IoU between two (x, y, w, h) boxes."""
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def bbox_overlap_ratio(
    a: tuple[int, int, int, int], b: tuple[int, int, int, int]
) -> float:
    """inter / min(area_a, area_b) — used for text-region dedup heuristics."""
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    return inter / max(1, min(aw * ah, bw * bh))


def clamp_bbox(
    x: int, y: int, w: int, h: int, width: int, height: int
) -> tuple[int, int, int, int]:
    """Clamp a box to image bounds, ensuring w/h >= 1."""
    x = max(0, min(x, width - 1))
    y = max(0, min(y, height - 1))
    w = max(1, min(w, width - x))
    h = max(1, min(h, height - y))
    return x, y, w, h


# ── Project / Layer schemas ─────────────────────────────────────────

class BBox(BaseModel):
    x: int
    y: int
    width: int
    height: int

    def as_tuple(self) -> tuple[int, int, int, int]:
        return (self.x, self.y, self.width, self.height)


class LayerAttributes(BaseModel):
    label: str = ""
    confidence: float = 0.0
    notes: str = ""
    extra: dict[str, Any] = Field(default_factory=dict)


class ImageLayer(BaseModel):
    id: str
    name: str
    type: str  # background | human | product | text | face_hair | decor | shadow | ...
    bbox: BBox
    order: int = 0
    visible: bool = True
    locked: bool = False
    asset_url: str | None = None
    mask_url: str | None = None
    attributes: LayerAttributes = Field(default_factory=LayerAttributes)


class ImageManifest(BaseModel):
    project_id: str
    source_url: str
    width: int
    height: int
    analyzer_version: str = "pixelforge-0.1.0"
    summary: str = ""
    stage: str = "pixelforge-v0.1"
    layers: list[ImageLayer] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    def layers_of_type(self, type_: str) -> list[ImageLayer]:
        return [l for l in self.layers if l.type == type_]


class ReplacementTargetRegion(BaseModel):
    id: str
    label: str
    bbox: BBox
    source: str = "vision_plan"
    mask_url: str | None = None


class ReplacementManifest(BaseModel):
    project_id: str
    scene_url: str
    product_url: str
    background_clean_url: str | None = None
    target_bbox: BBox | None = None
    target_mask_url: str | None = None
    target_regions: list[ReplacementTargetRegion] = Field(default_factory=list)
    product_cutout_url: str | None = None
    foreground_overlay_url: str | None = None
    model_plan_url: str | None = None
    result_url: str | None = None
    style_summary: str = ""
    warnings: list[str] = Field(default_factory=list)


# ── Project state container ─────────────────────────────────────────

@dataclass
class Project:
    """In-memory handle to a project (a directory of artifacts)."""
    project_id: str
    project_dir: Path
    original_path: Path | None = None
    product_path: Path | None = None
    manifest: ImageManifest | None = None
    replacement: ReplacementManifest | None = None

    def asset(self, *parts: str) -> str:
        """Return a relative URL path used by the API to serve this asset."""
        return "/".join(("assets", self.project_id, *parts))

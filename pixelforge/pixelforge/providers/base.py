"""Core provider protocols for pixelforge.

Every concrete AI capability (OCR, VLM planning, segmentation, image editing,
human parsing, generative repair) is implemented as a Provider conforming to
one of the Protocols defined here. Workflows in ``pixelforge/workflows`` only
depend on these Protocols — never on concrete Provider classes — which is what
makes a single project run on heterogeneous backends (local SAM, PaddleOCR
Cloud, OpenAI Vision, custom HTTP, ...).

Design notes
------------
* Every Provider exposes a boolean ``available`` flag and a human-readable
  ``reason`` string. The UI surfaces these so users always know *why* a
  feature is disabled rather than seeing silent failures.
* Provider constructors accept a settings object (a Pydantic model) so the same
  config schema (``pixelforge.core.settings.PixelforgeSettings``) drives every
  Provider. Settings is the single source of truth.
* Methods return *domain* types (``GroundedObject``, ``TextBox``, ``Mask``)
  defined in ``pixelforge.core.models``, never raw library types like
  ``np.ndarray`` or ``dict``. This keeps the workflow layer backend-agnostic.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Literal, Protocol, runtime_checkable

from PIL import Image


# ── Shared domain types used by Provider return values ────────────────────
# These are declared here (instead of in core/models) to avoid a circular
# import: core/models imports from providers/base to type-hint fields, and
# providers/base imports core/models for the same reason. The minimal
# re-exports below keep the cycle at a single direction.

@dataclass(frozen=True)
class GroundedObject:
    """A spatially-grounded object (product, person, text, logo, decor)."""
    id: str
    label: str
    bbox: tuple[int, int, int, int]  # (x, y, w, h) in image pixel coords
    confidence: float = 1.0
    prompt: str | None = None
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class TextBox:
    """A recognized text region with optional transcribed content."""
    bbox: tuple[int, int, int, int]
    text: str
    confidence: float
    language: str | None = None


@dataclass(frozen=True)
class MaskResult:
    """A binary mask plus metadata."""
    object_id: str
    mask_path: Path          # PNG file with the mask rendered
    bbox: tuple[int, int, int, int]
    area: int                # pixel count
    score: float = 1.0       # confidence / IoU
    mode: str = "bbox"       # one of: auto | point | box | bbox


# ── Mode discriminators ──────────────────────────────────────────────────
SegmentationMode = Literal["auto", "point", "box", "bbox"]


# ── 5 Provider Protocols ─────────────────────────────────────────────────

@runtime_checkable
class OCRProvider(Protocol):
    """Extract text regions and transcripts from an image."""
    name: str
    available: bool
    reason: str

    def read_text(self, image: Image.Image, *, hint: str = "") -> list[TextBox]:
        """Return every text region detected in ``image``.

        ``hint`` is an optional prompt used by VLM-backed OCR providers to bias
        detection toward domain-specific text (e.g. ecommerce CTA / buttons).
        """
        ...


@runtime_checkable
class GroundingProvider(Protocol):
    """Detect and label objects of interest (model, product, logo, decor).

    Sometimes called "open-vocabulary detection" or "VLM grounding". Used by
    the replacement workflow to find the *target* of replacement (the model /
    product) and *protected* regions (text, logos).
    """
    name: str
    available: bool
    reason: str

    def ground(self, image: Image.Image, *, task: str) -> list[GroundedObject]:
        """Return grounded objects relevant to ``task``.

        ``task`` is a free-form string like ``"ecom poster replacement"`` that
        the provider can use to bias detection.
        """
        ...


@runtime_checkable
class SegmentationProvider(Protocol):
    """Convert grounded objects (or user prompts) into precise binary masks.

    Four ``mode`` values cover everything pixelforge needs:

    * ``"auto"``   — segment every salient object in the image (SAM AMG).
    * ``"point"``  — segment one or more objects at given pixel points (SAM
                     predictor with point prompts).
    * ``"box"``    — segment the object inside an xyxy bounding box (SAM
                     predictor with box prompt).
    * ``"bbox"``   — for each GroundedObject in ``objects``, return a mask
                     confined to the bbox region. Used by layer analysis.
    """
    name: str
    available: bool
    reason: str

    def segment(
        self,
        image: Image.Image,
        objects: list[GroundedObject] | None = None,
        *,
        mode: SegmentationMode = "bbox",
        points: Iterable[tuple[int, int]] | None = None,
        box: tuple[int, int, int, int] | None = None,
        work_dir: Path | None = None,
    ) -> dict[str, MaskResult]:
        """Return a mapping ``object_id -> MaskResult``.

        If ``mode`` is ``"auto"``, ``objects`` may be empty and IDs are
        auto-assigned ("obj_0", "obj_1", ...).
        """
        ...


@runtime_checkable
class ImageEditProvider(Protocol):
    """Generate the final replacement / harmonized image.

    The pixelforge replacement workflow always calls a single
    ``edit_product_replacement`` (or ``harmonize`` for lighter harmonization
    use cases) — providers choose their own implementation strategy behind
    this single interface.
    """
    name: str
    available: bool
    reason: str

    def edit_product_replacement(
        self,
        *,
        original: Image.Image,
        reference: Image.Image,
        mask: Image.Image,
        prompt: str,
        work_dir: Path,
    ) -> Image.Image | None:
        """Return the harmonized full-canvas image, or ``None`` on failure."""
        ...


@runtime_checkable
class GenerativeRepairProvider(Protocol):
    """Inpaint / outpaint / reconstruct missing or unwanted regions.

    Distinct from ImageEditProvider: edit produces a *replacement* of a
    target region; repair produces a *reconstruction* of a missing region
    (background, occlusion, damage). Different model families are usually
    best at each (e.g. FLUX Kontext for edit, LaMa/SD-Inpainting for repair).
    """
    name: str
    available: bool
    reason: str

    def repair(
        self,
        image: Image.Image,
        mask: Image.Image,
        prompt: str,
        *,
        work_dir: Path | None = None,
    ) -> Image.Image | None:
        """Return the repaired image (same size as input) or ``None``."""
        ...


# ── Helper: a common "disabled" sentinel for unimplemented providers ────

class DisabledProvider:
    """Mixin-style base for providers that exist but are not configured.

    Concrete providers can set ``self.available = False`` and
    ``self.reason = "..."`` in ``__init__`` to inherit this behavior.
    """
    available: bool = False
    reason: str = "Provider is not configured"

    def unavailable(self, method_name: str) -> None:
        raise RuntimeError(
            f"{type(self).__name__}.{method_name}() called but provider is "
            f"unavailable: {self.reason}"
        )

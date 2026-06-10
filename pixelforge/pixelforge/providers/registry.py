"""Provider registry — assembles all configured providers in one place.

Callers (workflows, API routes) obtain a ``ProviderRegistry`` via
:func:`build_provider_registry` and only ever interact with Protocol-
conformant objects. The registry hides the per-provider construction logic
and gracefully reports ``available=False`` for any provider that is not
configured.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from pixelforge.core.settings import PixelforgeSettings
from pixelforge.providers.base import (
    GenerativeRepairProvider,
    GroundingProvider,
    ImageEditProvider,
    OCRProvider,
    SegmentationProvider,
)
from pixelforge.providers.edit.factory import build_image_edit_provider
from pixelforge.providers.ocr.paddleocr_cloud import PaddleOCRCloudProvider
from pixelforge.providers.parse.schp_human_parser import SCHPHumanParser
from pixelforge.providers.repair.factory import build_repair_provider
from pixelforge.providers.segment.sam_local import SAMLocalSegmenter
from pixelforge.providers.vision.openai_vision import OpenAIVisionPlanner


@dataclass
class ProviderRegistry:
    """Bundle of every concrete provider the workflow may need.

    Each field is either an instance of the corresponding Protocol *or*
    ``None`` if the user has not configured that capability.
    """
    ocr: OCRProvider | None = None
    grounding: GroundingProvider | None = None
    segmentation: SegmentationProvider | None = None
    edit: ImageEditProvider | None = None
    repair: GenerativeRepairProvider | None = None
    human_parser: SCHPHumanParser | None = None
    details: dict[str, dict[str, str]] = field(default_factory=dict)


def build_provider_registry(settings: PixelforgeSettings) -> ProviderRegistry:
    """Build a registry from the current settings. Always returns a registry,
    even if every provider is ``available=False`` — workflows use the boolean
    flags to decide whether to call into the provider or fall back.
    """
    ocr = PaddleOCRCloudProvider(settings)
    grounding = OpenAIVisionPlanner(settings)
    segmenter = SAMLocalSegmenter(settings)
    edit = build_image_edit_provider(settings)
    repair = build_repair_provider(settings)
    parser = SCHPHumanParser(settings)

    return ProviderRegistry(
        ocr=ocr if ocr.available else None,
        grounding=grounding if grounding.available else None,
        segmentation=segmenter if segmenter.available else None,
        edit=edit if edit.available else None,
        repair=repair if repair.available else None,
        human_parser=parser if parser.available else None,
        details={
            "ocr": {"provider": ocr.name, "available": str(ocr.available), "reason": ocr.reason},
            "grounding": {"provider": grounding.name, "available": str(grounding.available), "reason": grounding.reason},
            "segmentation": {"provider": segmenter.name, "available": str(segmenter.available), "reason": segmenter.reason},
            "edit": {"provider": edit.name, "available": str(edit.available), "reason": edit.reason},
            "repair": {"provider": repair.name, "available": str(repair.available), "reason": repair.reason},
            "human_parser": {"provider": parser.name, "available": str(parser.available), "reason": parser.reason},
        },
    )


__all__ = ["ProviderRegistry", "build_provider_registry"]

"""Workflow Protocol — every workflow conforms to this shape."""
from __future__ import annotations

from typing import Protocol, runtime_checkable

from PIL import Image

from pixelforge.core.models import ImageManifest, ReplacementManifest
from pixelforge.core.storage import ProjectStorage
from pixelforge.providers.registry import ProviderRegistry


@runtime_checkable
class Workflow(Protocol):
    """A business workflow that produces a ``Manifest`` (and optionally a
    ``ReplacementManifest``) from a project directory.

    Workflows are *pure orchestration*: they call into Providers and write
    results via ``ProjectStorage``. They never instantiate Providers or
    touch the network themselves.
    """

    name: str

    def requires(self) -> list[str]:
        """Return the names of providers this workflow depends on."""
        ...

    def run(
        self,
        storage: ProjectStorage,
        project_id: str,
        providers: ProviderRegistry,
        *,
        options: dict[str, object] | None = None,
    ) -> ImageManifest:
        ...

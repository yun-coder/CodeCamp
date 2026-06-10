"""File-system storage for pixelforge projects.

Each project lives in ``output_dir/<project_id>/`` and contains:

* ``original.png`` — uploaded source image
* ``product.png`` — uploaded product reference (optional)
* ``manifest.json`` — serialized ImageManifest
* ``replacement.json`` — serialized ReplacementManifest (if any)
* ``compositions/*.png`` — final / intermediate compositions
* ``masks/*.png`` — per-object binary masks
* ``layers/*.png`` — per-layer RGBA assets
* ``model_plan.json`` — vision-planner output
* ``analysis_report.json`` — analyzer summary

This module is the single owner of all on-disk project state. Workflows and
Providers only call its methods; they never touch the filesystem directly.
"""
from __future__ import annotations

import json
import shutil
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image

from pixelforge.core.models import ImageManifest, Project, ReplacementManifest


@dataclass
class ProjectStorage:
    """Filesystem-backed project store.

    All paths are derived from a single ``root`` directory. The store is
    cheap to construct; create one per request (or as a module-level
    singleton in the FastAPI app).
    """
    root: Path

    def __init__(self, root: str | Path = "./pixelforge_runs") -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    # ── ID & directory management ──────────────────────────────────
    def create_project(self) -> str:
        project_id = uuid.uuid4().hex[:12]
        (self.root / project_id).mkdir(parents=True, exist_ok=True)
        (self.root / project_id / "compositions").mkdir(exist_ok=True)
        (self.root / project_id / "masks").mkdir(exist_ok=True)
        (self.root / project_id / "layers").mkdir(exist_ok=True)
        return project_id

    def project_dir(self, project_id: str) -> Path:
        return self.root / project_id

    def require_project_dir(self, project_id: str) -> Path:
        d = self.project_dir(project_id)
        if not d.is_dir():
            raise FileNotFoundError(f"Project not found: {project_id}")
        return d

    # ── Image I/O ─────────────────────────────────────────────────
    def save_original(self, project_id: str, image: Image.Image) -> Path:
        path = self.project_dir(project_id) / "original.png"
        image.convert("RGBA").save(path, format="PNG")
        return path

    def save_product(self, project_id: str, image: Image.Image) -> Path:
        path = self.project_dir(project_id) / "product.png"
        image.convert("RGBA").save(path, format="PNG")
        return path

    def original_path(self, project_id: str) -> Path:
        return self.project_dir(project_id) / "original.png"

    def product_path(self, project_id: str) -> Path:
        return self.project_dir(project_id) / "product.png"

    # ── JSON I/O ──────────────────────────────────────────────────
    def save_manifest(self, project_id: str, manifest: ImageManifest) -> Path:
        path = self.project_dir(project_id) / "manifest.json"
        path.write_text(
            manifest.model_dump_json(indent=2), encoding="utf-8"
        )
        return path

    def load_manifest(self, project_id: str) -> ImageManifest:
        path = self.require_project_dir(project_id) / "manifest.json"
        if not path.exists():
            raise FileNotFoundError(f"manifest.json not found in {path}")
        return ImageManifest.model_validate_json(path.read_text(encoding="utf-8"))

    def save_replacement(
        self, project_id: str, replacement: ReplacementManifest
    ) -> Path:
        path = self.project_dir(project_id) / "replacement.json"
        path.write_text(
            replacement.model_dump_json(indent=2), encoding="utf-8"
        )
        return path

    def load_replacement(self, project_id: str) -> ReplacementManifest:
        path = self.require_project_dir(project_id) / "replacement.json"
        if not path.exists():
            raise FileNotFoundError(f"replacement.json not found in {path}")
        return ReplacementManifest.model_validate_json(
            path.read_text(encoding="utf-8")
        )

    def save_json(self, project_id: str, name: str, data: dict[str, Any]) -> Path:
        path = self.project_dir(project_id) / name
        path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        return path

    def load_json(self, project_id: str, name: str) -> dict[str, Any]:
        path = self.require_project_dir(project_id) / name
        if not path.exists():
            raise FileNotFoundError(f"{name} not found in {path}")
        return json.loads(path.read_text(encoding="utf-8"))

    # ── URL helpers ───────────────────────────────────────────────
    def asset_url(self, project_id: str, *parts: str) -> str:
        return f"/assets/{project_id}/" + "/".join(parts)

    def resolve_asset(self, project_id: str, *parts: str) -> Path:
        """Resolve an asset URL to an absolute path within the project dir.

        Defends against path-traversal: any ``..`` segment raises ``ValueError``.
        """
        base = self.require_project_dir(project_id).resolve()
        candidate = (base / Path(*parts)).resolve()
        try:
            candidate.relative_to(base)
        except ValueError as exc:
            raise ValueError(f"Invalid asset path: {parts}") from exc
        return candidate

    # ── Layer / mask asset writers ────────────────────────────────
    def save_layer_assets(
        self,
        project_id: str,
        layer_id: str,
        rgba: Image.Image,
        mask: Image.Image | None = None,
    ) -> tuple[str, str | None]:
        """Write a per-layer RGBA PNG and (optionally) its mask PNG.

        Returns ``(layer_relpath, mask_relpath_or_None)`` as **strings**
        relative to the project directory, suitable for embedding in
        ``asset_url``.
        """
        proj = self.require_project_dir(project_id)
        layers_dir = proj / "layers"
        masks_dir = proj / "masks"
        layers_dir.mkdir(exist_ok=True)
        masks_dir.mkdir(exist_ok=True)
        layer_rel = f"layers/{layer_id}.png"
        mask_rel: str | None = None
        rgba.save(layers_dir / f"{layer_id}.png", format="PNG")
        if mask is not None:
            mask_rel = f"masks/{layer_id}.png"
            mask.convert("L").save(masks_dir / f"{layer_id}.png", format="PNG")
        return layer_rel, mask_rel

    # ── Layer package zip ─────────────────────────────────────────
    def build_layer_package(self, project_id: str) -> Path:
        """Zip the entire project directory into ``<id>_package.zip``.

        The resulting zip is at the project root; its name is deterministic
        so multiple calls don't pile up duplicates.
        """
        proj = self.require_project_dir(project_id)
        zip_path = proj.parent / f"{project_id}_package.zip"
        if zip_path.exists():
            zip_path.unlink()
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in proj.rglob("*"):
                if f.is_file():
                    zf.write(f, f.relative_to(proj))
        return zip_path

    # ── Project handle convenience ────────────────────────────────
    def load_project(self, project_id: str) -> Project:
        """Build an in-memory Project handle (does not load image bytes)."""
        proj = self.require_project_dir(project_id)
        p = Project(project_id=project_id, project_dir=proj)
        orig = self.original_path(project_id)
        prod = self.product_path(project_id)
        if orig.exists():
            p.original_path = orig
        if prod.exists():
            p.product_path = prod
        try:
            p.manifest = self.load_manifest(project_id)
        except FileNotFoundError:
            pass
        try:
            p.replacement = self.load_replacement(project_id)
        except FileNotFoundError:
            pass
        return p

    def delete_project(self, project_id: str) -> None:
        d = self.project_dir(project_id)
        if d.exists():
            shutil.rmtree(d)

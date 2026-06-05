from __future__ import annotations

import json
import os
import uuid
import zipfile
from pathlib import Path
from typing import Any

from PIL import Image

from app.models import ImageManifest, ReplacementManifest


class ProjectStorage:
    def __init__(self, root: str | os.PathLike[str] | None = None) -> None:
        self.root = Path(root or os.environ.get("ILA_DATA_DIR", "runs")).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def create_project(self) -> str:
        project_id = uuid.uuid4().hex[:12]
        project_dir = self.project_dir(project_id)
        (project_dir / "layers").mkdir(parents=True, exist_ok=True)
        (project_dir / "masks").mkdir(parents=True, exist_ok=True)
        (project_dir / "compositions").mkdir(parents=True, exist_ok=True)
        return project_id

    def project_dir(self, project_id: str) -> Path:
        if not project_id.replace("-", "").isalnum():
            raise ValueError("Invalid project id")
        return self.root / project_id

    def require_project_dir(self, project_id: str) -> Path:
        project_dir = self.project_dir(project_id)
        if not project_dir.exists():
            raise FileNotFoundError(project_id)
        return project_dir

    def original_path(self, project_id: str) -> Path:
        return self.require_project_dir(project_id) / "original.png"

    def product_path(self, project_id: str) -> Path:
        return self.require_project_dir(project_id) / "product.png"

    def save_original(self, project_id: str, image: Image.Image) -> Path:
        path = self.project_dir(project_id) / "original.png"
        image.convert("RGB").save(path)
        return path

    def save_product(self, project_id: str, image: Image.Image) -> Path:
        path = self.require_project_dir(project_id) / "product.png"
        image.convert("RGBA").save(path)
        return path

    def save_manifest(self, manifest: ImageManifest) -> Path:
        path = self.require_project_dir(manifest.project_id) / "layers.json"
        path.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
        return path

    def save_replacement(self, manifest: ReplacementManifest) -> Path:
        path = self.require_project_dir(manifest.project_id) / "replacement.json"
        path.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
        return path

    def save_json(self, project_id: str, filename: str, payload: object) -> Path:
        path = self.require_project_dir(project_id) / filename
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        return path

    def load_json(self, project_id: str, filename: str, default: Any | None = None) -> Any:
        path = self.require_project_dir(project_id) / filename
        if not path.exists():
            return default
        return json.loads(path.read_text(encoding="utf-8"))

    def load_manifest(self, project_id: str) -> ImageManifest:
        path = self.require_project_dir(project_id) / "layers.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        return ImageManifest.model_validate(data)

    def load_replacement(self, project_id: str) -> ReplacementManifest:
        path = self.require_project_dir(project_id) / "replacement.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        return ReplacementManifest.model_validate(data)

    def asset_url(self, project_id: str, *parts: str) -> str:
        return "/assets/" + "/".join([project_id, *parts])

    def build_layer_package(self, project_id: str) -> Path:
        project_dir = self.require_project_dir(project_id)
        package_path = project_dir / "layer_package.zip"
        include_dirs = {"layers", "masks", "compositions"}
        include_files = {
            "original.png",
            "product.png",
            "layers.json",
            "text_layers.json",
            "analysis_report.json",
            "replacement.json",
        }
        with zipfile.ZipFile(package_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for file_path in project_dir.rglob("*"):
                if not file_path.is_file() or file_path == package_path:
                    continue
                rel = file_path.relative_to(project_dir)
                if rel.parts[0] in include_dirs or rel.as_posix() in include_files:
                    archive.write(file_path, rel.as_posix())
        return package_path

"""``/api/projects`` — project lifecycle (create, list, get, delete)."""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from pixelforge.core.storage import ProjectStorage
from fastapi import Request

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _storage(request: Request) -> ProjectStorage:
    return request.app.state.storage


@router.post("")
async def create_project(request: Request, file: UploadFile = File(...)) -> dict[str, str]:
    storage = _storage(request)
    try:
        image = Image.open(file.file)
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(400, "Please upload a valid image file.") from exc
    project_id = storage.create_project()
    storage.save_original(project_id, image)
    return {
        "project_id": project_id,
        "source_url": storage.asset_url(project_id, "original.png"),
    }


@router.post("/{project_id}/product")
async def upload_product(
    project_id: str, request: Request, file: UploadFile = File(...)
) -> dict[str, str]:
    storage = _storage(request)
    try:
        storage.require_project_dir(project_id)
        image = Image.open(file.file)
        image.load()
    except FileNotFoundError as exc:
        raise HTTPException(404, "Project not found.") from exc
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(400, "Please upload a valid product image.") from exc
    storage.save_product(project_id, image)
    return {
        "project_id": project_id,
        "product_url": storage.asset_url(project_id, "product.png"),
    }


@router.get("/{project_id}/manifest")
def get_manifest(project_id: str, request: Request) -> dict:
    storage = _storage(request)
    try:
        return storage.load_manifest(project_id).model_dump()
    except FileNotFoundError as exc:
        raise HTTPException(404, "Manifest not found. Run analysis first.") from exc


@router.get("/{project_id}/replacement")
def get_replacement(project_id: str, request: Request) -> dict:
    storage = _storage(request)
    try:
        return storage.load_replacement(project_id).model_dump()
    except FileNotFoundError as exc:
        raise HTTPException(404, "Replacement not found. Run replacement first.") from exc


@router.get("/{project_id}/package")
def download_package(project_id: str, request: Request):
    storage = _storage(request)
    try:
        zip_path = storage.build_layer_package(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(404, "Project not found.") from exc
    from fastapi.responses import FileResponse
    return FileResponse(zip_path, filename=f"pixelforge-{project_id}.zip")


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, request: Request) -> None:
    storage = _storage(request)
    storage.delete_project(project_id)

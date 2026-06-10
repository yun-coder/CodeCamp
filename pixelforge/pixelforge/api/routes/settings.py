"""``/api/settings`` — read & update the global settings (sanitized)."""
from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel

from pixelforge.core.settings import PixelforgeSettings

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Fields that should never be echoed back to the client.
SECRET_FIELDS = {
    ("minimax", "api_key"),
    ("minimax", "group_id"),
    ("paddleocr", "access_token"),
    ("image_edit", "custom", "api_key"),
    ("repair", "api_key"),
}


def _scrub(settings: PixelforgeSettings) -> dict:
    """Return a settings dict with secrets redacted."""
    raw = settings.model_dump()
    for path in SECRET_FIELDS:
        target = raw
        for key in path[:-1]:
            target = target.get(key, {}) if isinstance(target, dict) else {}
        if isinstance(target, dict) and path[-1] in target:
            target[path[-1]] = "***"
    raw["output_dir"] = str(raw["output_dir"])
    return raw


@router.get("")
def get_settings(request: Request) -> dict:
    settings: PixelforgeSettings = request.app.state.settings
    return _scrub(settings)


class SettingsUpdate(BaseModel):
    # Top-level only; secret fields are write-once via /api/secrets in a
    # future release. For now this endpoint only updates non-secret fields.
    output_dir: str | None = None
    port: int | None = None
    log_level: str | None = None


@router.post("")
def update_settings(update: SettingsUpdate, request: Request) -> dict:
    settings: PixelforgeSettings = request.app.state.settings
    if update.output_dir is not None:
        settings.output_dir = update.output_dir
    if update.port is not None:
        settings.port = update.port
    if update.log_level is not None:
        settings.log_level = update.log_level
    return _scrub(settings)

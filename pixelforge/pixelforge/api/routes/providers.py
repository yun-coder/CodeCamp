"""``/api/providers/status`` — show every provider's availability + reason."""
from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/providers", tags=["providers"])


@router.get("/status")
def get_provider_status(request: Request) -> dict:
    providers = request.app.state.providers
    return providers.details

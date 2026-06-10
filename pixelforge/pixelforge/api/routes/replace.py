"""``/api/projects/{id}/replacement/*`` — run the xiaohua replacement workflow."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from pixelforge.core.models import ReplacementManifest
from pixelforge.workflows.xiaohua_replacement import XiaohuaReplacementWorkflow

router = APIRouter(prefix="/api/projects", tags=["replace"])


def _classify(exc: Exception) -> Exception:
    """Map known workflow errors to HTTP-friendly errors.

    ``FileNotFoundError`` is a workflow input issue (e.g. product.png
    missing) — surface as 400, not 404. ``RuntimeError`` is a workflow
    business-logic failure — also 400. Anything else becomes 500.
    """
    if isinstance(exc, FileNotFoundError):
        return HTTPException(400, str(exc))
    if isinstance(exc, RuntimeError):
        return HTTPException(400, str(exc))
    return HTTPException(500, f"Unexpected: {exc}")


@router.post("/{project_id}/replacement/analyze")
def replacement_analyze(project_id: str, request: Request) -> dict:
    storage = request.app.state.storage
    providers = request.app.state.providers
    try:
        replacement = XiaohuaReplacementWorkflow().run(
            storage, project_id, providers, options={"compose": False}
        )
    except (FileNotFoundError, RuntimeError) as exc:
        raise _classify(exc) from exc
    return replacement.model_dump()


@router.post("/{project_id}/replacement/compose", response_model=ReplacementManifest)
def replacement_compose(project_id: str, request: Request) -> ReplacementManifest:
    storage = request.app.state.storage
    providers = request.app.state.providers
    try:
        return XiaohuaReplacementWorkflow().run(
            storage, project_id, providers, options={"compose": True}
        )
    except (FileNotFoundError, RuntimeError) as exc:
        raise _classify(exc) from exc

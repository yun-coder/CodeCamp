"""``/api/projects/{id}/analyze`` — run the layer-analysis workflow."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from pixelforge.core.models import ImageManifest
from pixelforge.workflows.layer_analysis import LayerAnalysisWorkflow

router = APIRouter(prefix="/api/projects", tags=["analyze"])


@router.post("/{project_id}/analyze", response_model=ImageManifest)
def analyze_project(project_id: str, request: Request) -> ImageManifest:
    storage = request.app.state.storage
    providers = request.app.state.providers
    try:
        workflow = LayerAnalysisWorkflow()
        return workflow.run(storage, project_id, providers)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc

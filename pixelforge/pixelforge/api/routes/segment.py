"""``/api/segment`` — direct SAM segmentation endpoint.

Bypasses the workflow layer for callers that want raw segmentation
(auto / point / box / bbox) without writing a project first.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError

from pixelforge.providers.base import SegmentationMode

router = APIRouter(prefix="/api/segment", tags=["segment"])


@router.post("")
async def segment(
    request: Request,
    file: UploadFile = File(...),
    mode: SegmentationMode = Form("auto"),
    points: str | None = Form(None, description='Comma-separated "x,y" pairs'),
    box: str | None = Form(None, description='"x1,y1,x2,y2"'),
) -> dict:
    providers = request.app.state.providers
    if providers.segmentation is None:
        raise HTTPException(503, "No segmentation provider is configured.")
    try:
        image = Image.open(file.file)
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(400, "Please upload a valid image file.") from exc

    parsed_points: list[tuple[int, int]] | None = None
    if points:
        try:
            parsed_points = [
                (int(p.split(",")[0]), int(p.split(",")[1]))
                for p in points.split(";")
            ]
        except (ValueError, IndexError) as exc:
            raise HTTPException(400, f"Invalid 'points' value: {points}") from exc
    parsed_box: tuple[int, int, int, int] | None = None
    if box:
        try:
            parsed_box = tuple(int(v) for v in box.split(","))  # type: ignore[assignment]
        except ValueError as exc:
            raise HTTPException(400, f"Invalid 'box' value: {box}") from exc

    with tempfile.TemporaryDirectory() as tmp:
        work_dir = Path(tmp) / "out"
        work_dir.mkdir(parents=True, exist_ok=True)
        try:
            results = providers.segmentation.segment(
                image,
                mode=mode,
                points=parsed_points,
                box=parsed_box,
                work_dir=work_dir,
            )
        except Exception as exc:
            raise HTTPException(500, f"Segmentation failed: {exc}") from exc
    return {
        "mode": mode,
        "total_objects": len(results),
        "objects": [
            {
                "id": r.object_id,
                "bbox": list(r.bbox),
                "area": r.area,
                "score": r.score,
                "mask_path": str(r.mask_path),
            }
            for r in results.values()
        ],
    }

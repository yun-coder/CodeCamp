"""
FastAPI web server for SAM Agent Tool.

Provides:
- Web UI at /
- File upload + auto-segmentation at POST /api/segment
- Result file serving at GET /api/outputs/{session_id}/{filename}

Usage:
    python -m sam_agent_tool web -c sam_vit_b.pth --port 8080
"""

import os
import uuid
import shutil
from pathlib import Path
from typing import Tuple

import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse, HTMLResponse

from .agent import SAMAgent

# ── App setup ──────────────────────────────────────────────────

STATIC_DIR = Path(__file__).parent / "static"
OUTPUTS_ROOT = Path("outputs")

app = FastAPI(
    title="SAM Agent Tool",
    description="Upload an image and let SAM segment everything automatically.",
    version="1.0.0",
)

_agent: SAMAgent = None


def get_agent() -> SAMAgent:
    if _agent is None:
        raise HTTPException(503, "Agent not initialized.")
    return _agent


# ── Helpers ─────────────────────────────────────────────────────


async def _save_upload(file: UploadFile) -> Tuple[str, Path, str]:
    """Save an uploaded image and return (session_id, session_dir, input_path)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are accepted.")

    session_id = uuid.uuid4().hex[:12]
    session_dir = OUTPUTS_ROOT / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    ext = os.path.splitext(file.filename or "image.png")[1] or ".png"
    input_path = session_dir / f"input{ext}"

    with open(input_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return session_id, session_dir, str(input_path)


def _build_response(result: dict, session_id: str) -> dict:
    """Attach overlay / mask / crop URLs to a segmentation result."""
    resp = {**result, "session_id": session_id}
    if result.get("task", {}).get("status") == "success":
        resp["overlay_url"] = f"/api/outputs/{session_id}/overlay.png"
    for obj in resp.get("objects", []):
        obj["mask_url"] = f"/api/outputs/{session_id}/{obj['mask_file']}"
        obj["crop_url"] = f"/api/outputs/{session_id}/{obj['crop_file']}"
    return resp


# ── Routes ─────────────────────────────────────────────────────


@app.get("/", response_class=HTMLResponse)
async def index():
    html_path = STATIC_DIR / "index.html"
    if html_path.exists():
        return html_path.read_text(encoding="utf-8")
    return "<h1>UI not found</h1>"


@app.get("/api/health")
async def health():
    agent_ready = _agent is not None and _agent.is_ready
    return {
        "status": "ok" if agent_ready else "loading",
        "model": _agent.get_model_info() if _agent else None,
    }


@app.post("/api/segment")
async def api_segment(file: UploadFile = File(...)):
    agent = get_agent()

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are accepted.")

    session_id = uuid.uuid4().hex[:12]
    session_dir = OUTPUTS_ROOT / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    ext = os.path.splitext(file.filename or "image.png")[1] or ".png"
    input_path = session_dir / f"input{ext}"

    with open(input_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    result = agent.process(str(input_path), str(session_dir))

    response = {
        **result,
        "session_id": session_id,
        "overlay_url": (
            f"/api/outputs/{session_id}/overlay.png"
            if result["task"]["status"] == "success"
            else None
        ),
    }

    for obj in response.get("objects", []):
        obj["mask_url"] = f"/api/outputs/{session_id}/{obj['mask_file']}"
        obj["crop_url"] = f"/api/outputs/{session_id}/{obj['crop_file']}"

    return response


# ── New: separate upload-then-segment workflow ──────────────────


@app.post("/api/upload")
async def api_upload(file: UploadFile = File(...)):
    """Upload an image and return session info (width/height included)."""
    session_id, session_dir, input_path = await _save_upload(file)

    img = cv2.imread(input_path)
    if img is None:
        raise HTTPException(400, "Cannot read uploaded image.")
    h, w = img.shape[:2]

    return {
        "session_id": session_id,
        "image_url": f"/api/outputs/{session_id}/{os.path.basename(input_path)}",
        "width": w,
        "height": h,
        "filename": os.path.basename(input_path),
    }


@app.post("/api/segment/auto/{session_id}")
async def api_segment_auto(session_id: str, params: dict = None):
    """Run auto-segmentation on a previously uploaded image."""
    agent = get_agent()
    session_dir = OUTPUTS_ROOT / session_id
    if not session_dir.exists():
        raise HTTPException(404, "Session not found. Upload an image first.")

    # Find the input image in the session directory
    input_files = list(session_dir.glob("input.*"))
    if not input_files:
        raise HTTPException(404, "No input image found in session.")
    input_path = str(input_files[0])

    amg_kwargs = params or {}
    result = agent.process(input_path, str(session_dir), **amg_kwargs)
    return _build_response(result, session_id)


@app.post("/api/segment/prompt/{session_id}")
async def api_segment_prompt(session_id: str, payload: dict):
    """Run point-prompted segmentation on a previously uploaded image."""
    agent = get_agent()
    session_dir = OUTPUTS_ROOT / session_id
    if not session_dir.exists():
        raise HTTPException(404, "Session not found. Upload an image first.")

    input_files = list(session_dir.glob("input.*"))
    if not input_files:
        raise HTTPException(404, "No input image found in session.")
    input_path = str(input_files[0])

    points_raw = payload.get("points", [])
    labels = payload.get("labels")
    if not points_raw:
        raise HTTPException(400, "At least one point is required.")

    points = [(int(p[0]), int(p[1])) for p in points_raw]

    result = agent.process_with_prompt(input_path, str(session_dir), points=points, labels=labels)
    return _build_response(result, session_id)


@app.post("/api/segment/box/{session_id}")
async def api_segment_box(session_id: str, payload: dict):
    """Run box-prompted segmentation on a previously uploaded image."""
    agent = get_agent()
    session_dir = OUTPUTS_ROOT / session_id
    if not session_dir.exists():
        raise HTTPException(404, "Session not found. Upload an image first.")

    input_files = list(session_dir.glob("input.*"))
    if not input_files:
        raise HTTPException(404, "No input image found in session.")
    input_path = str(input_files[0])

    box_raw = payload.get("box")
    if not box_raw or len(box_raw) != 4:
        raise HTTPException(400, "Box must be [x1, y1, x2, y2].")

    box = (int(box_raw[0]), int(box_raw[1]), int(box_raw[2]), int(box_raw[3]))

    result = agent.process_with_box(input_path, str(session_dir), box=box)
    return _build_response(result, session_id)


@app.get("/api/outputs/{session_id}/{filename:path}")
async def serve_output(session_id: str, filename: str):
    file_path = OUTPUTS_ROOT / session_id / filename
    if not file_path.exists():
        raise HTTPException(404, f"File not found: {filename}")
    return FileResponse(str(file_path))


# ── Lifecycle ──────────────────────────────────────────────────


def init_agent(checkpoint: str, model_type: str = "vit_b", device: str = "cpu"):
    global _agent
    _agent = SAMAgent(checkpoint=checkpoint, model_type=model_type, device=device)
    print(f"Agent initialized: {_agent.get_model_info()}")


def run_server(checkpoint: str, model_type: str = "vit_b", device: str = "cpu",
               host: str = "0.0.0.0", port: int = 8080):
    import uvicorn

    init_agent(checkpoint, model_type, device)
    print(f"\n{'='*60}")
    print(f"  SAM Agent Tool - Web UI")
    print(f"  Open in browser: http://localhost:{port}")
    print(f"{'='*60}\n")
    uvicorn.run(app, host=host, port=port, log_level="info")

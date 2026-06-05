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

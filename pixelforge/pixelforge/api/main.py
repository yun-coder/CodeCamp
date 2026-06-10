"""FastAPI app: unified port 8700.

Phase 4 ships:

* A single ``FastAPI`` app (``pixelforge.api.main:app``)
* Route modules: ``projects``, ``analyze``, ``replace``, ``segment``,
  ``providers``, ``settings``, ``agent``
* Static frontend at ``/static`` and an index page at ``/``
* A ``run_server()`` entry point registered as the ``pixelforge-web``
  console script in ``pyproject.toml``.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from pixelforge.api.routes import (
    agent,
    analyze,
    projects,
    providers,
    replace,
    segment,
    settings as settings_routes,
)
from pixelforge.core.settings import PixelforgeSettings
from pixelforge.core.storage import ProjectStorage
from pixelforge.providers.registry import build_provider_registry

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: build the settings, storage, and provider
    registry once at startup, share via ``app.state``.
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    settings = PixelforgeSettings()
    settings.output_dir.mkdir(parents=True, exist_ok=True)
    storage = ProjectStorage(settings.output_dir)
    registry = build_provider_registry(settings)
    app.state.settings = settings
    app.state.storage = storage
    app.state.providers = registry
    logger.info(
        "pixelforge ready — output=%s port=%s providers=%s",
        settings.output_dir,
        settings.port,
        {k: v["available"] for k, v in registry.details.items()},
    )
    yield
    # No teardown needed; the FastAPI process exits when the loop ends.


app = FastAPI(
    title="pixelforge",
    description="Pixel-level image understanding + editing workflow engine.",
    version="0.1.0",
    lifespan=lifespan,
)


# ── Mount static files (best-effort) ─────────────────────────────────
if STATIC_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ── Index / settings pages ──────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    html = STATIC_DIR / "index.html"
    if not html.exists():
        return HTMLResponse(
            "<h1>pixelforge</h1>"
            "<p>Web UI not yet bundled. See <code>/api/providers/status</code>.</p>",
            status_code=200,
        )
    return HTMLResponse(html.read_text(encoding="utf-8"))


@app.get("/settings", response_class=HTMLResponse)
def settings_page() -> HTMLResponse:
    html = STATIC_DIR / "settings.html"
    if not html.exists():
        return HTMLResponse("<h1>Settings UI not yet bundled</h1>", status_code=200)
    return HTMLResponse(html.read_text(encoding="utf-8"))


# ── Asset serving ───────────────────────────────────────────────────
@app.get("/assets/{project_id}/{path:path}")
def get_asset(project_id: str, path: str) -> FileResponse:
    storage: ProjectStorage = app.state.storage
    try:
        file_path = storage.resolve_asset(project_id, *path.split("/"))
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Asset not found")
    return FileResponse(file_path)


# ── Include routers ────────────────────────────────────────────────
app.include_router(projects.router)
app.include_router(analyze.router)
app.include_router(replace.router)
app.include_router(segment.router)
app.include_router(providers.router)
app.include_router(settings_routes.router)
app.include_router(agent.router)


# ── Health ──────────────────────────────────────────────────────────
@app.get("/api/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "providers": app.state.providers.details,
    }


# ── Entry point for `pixelforge-web` ────────────────────────────────
def run_server(
    host: str = "127.0.0.1",
    port: int | None = None,
    log_level: str | None = None,
) -> None:
    import uvicorn

    settings: PixelforgeSettings = app.state.settings if hasattr(app.state, "settings") else PixelforgeSettings()
    uvicorn.run(
        app,
        host=host,
        port=port or settings.port,
        log_level=(log_level or settings.log_level).lower(),
    )

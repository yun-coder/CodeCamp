from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError

from app.models import (
    AgentChatRequest,
    AgentChatResponse,
    AgentMessage,
    AgentStatus,
    AnalyzeResponse,
    ComposeRequest,
    ComposeResponse,
    ImageManifest,
    ProductUploadResponse,
    ReplacementAnalyzeResponse,
    ReplacementComposeResponse,
    ThirdPartySettingsPublic,
    ThirdPartySettingsUpdate,
    UploadResponse,
)
from app.services.analyzer import LayerAnalyzer
from app.services.agent import OpenAIWorkflowAgent
from app.services.human_parser import HumanParsingProvider
from app.services.image_editing import image_edit_provider_status
from app.services.image_layers import compose_manifest
from app.services.providers import build_provider_registry, provider_status
from app.services.replacement_workflow import XiaohuaReplacementWorkflow
from app.services.settings import SettingsStore
from app.services.storage import ProjectStorage


app = FastAPI(title="ImageLayerAgent", version="0.2.0")
storage = ProjectStorage()
settings_store = SettingsStore()
human_parser = HumanParsingProvider()
replacement_workflow = XiaohuaReplacementWorkflow(storage)

static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    return HTMLResponse((static_dir / "index.html").read_text(encoding="utf-8"))


@app.get("/settings", response_class=HTMLResponse)
def settings_page() -> HTMLResponse:
    return HTMLResponse((static_dir / "settings.html").read_text(encoding="utf-8"))


@app.post("/api/projects", response_model=UploadResponse)
async def create_project(file: UploadFile = File(...)) -> UploadResponse:
    try:
        image = Image.open(file.file)
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="Please upload a valid image file.") from exc

    project_id = storage.create_project()
    storage.save_original(project_id, image)
    return UploadResponse(project_id=project_id, source_url=storage.asset_url(project_id, "original.png"))


@app.post("/api/projects/{project_id}/product", response_model=ProductUploadResponse)
async def upload_product_image(project_id: str, file: UploadFile = File(...)) -> ProductUploadResponse:
    try:
        storage.require_project_dir(project_id)
        image = Image.open(file.file)
        image.load()
    except (FileNotFoundError, UnidentifiedImageError, OSError) as exc:
        if isinstance(exc, FileNotFoundError):
            raise HTTPException(status_code=404, detail="Project not found.") from exc
        raise HTTPException(status_code=400, detail="Please upload a valid product image.") from exc

    storage.save_product(project_id, image)
    return ProductUploadResponse(project_id=project_id, product_url=storage.asset_url(project_id, "product.png"))


@app.get("/api/providers/status")
def get_provider_status():
    settings = settings_store.load()
    providers = build_provider_registry(settings)
    status = provider_status(providers)
    agent = OpenAIWorkflowAgent(storage, settings)
    status["agent"] = agent.status()
    status["human_parser"] = human_parser.status()
    status["image_edit"] = image_edit_provider_status(settings)
    return status


@app.get("/api/agent/status", response_model=AgentStatus)
def get_agent_status() -> AgentStatus:
    agent = OpenAIWorkflowAgent(storage, settings_store.load())
    return AgentStatus(**agent.status())


@app.get("/api/agent/messages", response_model=list[AgentMessage])
def get_global_agent_messages() -> list[AgentMessage]:
    agent = OpenAIWorkflowAgent(storage, settings_store.load())
    return agent.load_global_messages()


@app.post("/api/agent/chat", response_model=AgentChatResponse)
def chat_with_global_agent(request: AgentChatRequest) -> AgentChatResponse:
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    agent = OpenAIWorkflowAgent(storage, settings_store.load())
    reply, messages = agent.chat_global(request.message.strip())
    return AgentChatResponse(
        project_id=None,
        available=agent.available,
        reply=reply,
        messages=messages,
        manifest=None,
        ocr_cards=[],
    )


@app.get("/api/settings", response_model=ThirdPartySettingsPublic)
def get_settings() -> ThirdPartySettingsPublic:
    return settings_store.public()


@app.post("/api/settings", response_model=ThirdPartySettingsPublic)
def update_settings(settings: ThirdPartySettingsUpdate) -> ThirdPartySettingsPublic:
    settings_store.save(settings)
    return settings_store.public()


@app.post("/api/projects/{project_id}/analyze", response_model=AnalyzeResponse)
def analyze_project(project_id: str) -> AnalyzeResponse:
    try:
        providers = build_provider_registry(settings_store.load())
        analyzer = LayerAnalyzer(storage, providers, human_parser=human_parser)
        manifest = analyzer.analyze(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found.") from exc
    return AnalyzeResponse(manifest=manifest)


@app.post("/api/projects/{project_id}/replacement/analyze", response_model=ReplacementAnalyzeResponse)
def analyze_replacement(project_id: str) -> ReplacementAnalyzeResponse:
    try:
        manifest = _load_or_analyze_project(project_id, require_ocr=True)
        replacement = replacement_workflow.build(project_id, manifest, compose=False, settings=settings_store.load())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project or product image not found.") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ReplacementAnalyzeResponse(manifest=manifest, replacement=replacement)


@app.post("/api/projects/{project_id}/replacement/compose", response_model=ReplacementComposeResponse)
def compose_replacement_project(project_id: str) -> ReplacementComposeResponse:
    try:
        manifest = _load_or_analyze_project(project_id, require_ocr=True)
        replacement = replacement_workflow.build(project_id, manifest, compose=True, settings=settings_store.load())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project or product image not found.") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ReplacementComposeResponse(replacement=replacement)


@app.post("/api/projects/{project_id}/agent/workflow", response_model=AgentChatResponse)
def run_agent_workflow(project_id: str) -> AgentChatResponse:
    try:
        manifest = _load_or_analyze_project(project_id)
        agent = OpenAIWorkflowAgent(storage, settings_store.load())
        reply, messages = agent.run_workflow(project_id, manifest)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found.") from exc
    return AgentChatResponse(
        project_id=project_id,
        available=agent.available,
        reply=reply,
        messages=messages,
        manifest=manifest,
        ocr_cards=agent.build_ocr_cards(manifest),
    )


@app.get("/api/projects/{project_id}/agent/messages", response_model=list[AgentMessage])
def get_agent_messages(project_id: str) -> list[AgentMessage]:
    try:
        agent = OpenAIWorkflowAgent(storage, settings_store.load())
        return agent.load_messages(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found.") from exc


@app.post("/api/projects/{project_id}/agent/chat", response_model=AgentChatResponse)
def chat_with_agent(project_id: str, request: AgentChatRequest) -> AgentChatResponse:
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    try:
        storage.require_project_dir(project_id)
        manifest = _try_load_manifest(project_id)
        agent = OpenAIWorkflowAgent(storage, settings_store.load())
        reply, messages = agent.chat(project_id, request.message.strip(), manifest)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found.") from exc
    return AgentChatResponse(
        project_id=project_id,
        available=agent.available,
        reply=reply,
        messages=messages,
        manifest=manifest,
        ocr_cards=agent.build_ocr_cards(manifest),
    )


@app.get("/api/projects/{project_id}/manifest")
def get_manifest(project_id: str):
    try:
        return storage.load_manifest(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Manifest not found. Run analysis first.") from exc


@app.post("/api/projects/{project_id}/compose", response_model=ComposeResponse)
def compose_project(project_id: str, request: ComposeRequest) -> ComposeResponse:
    try:
        project_dir = storage.require_project_dir(project_id)
        manifest = storage.load_manifest(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found or not analyzed.") from exc

    transforms = {item.id: item.model_dump() for item in request.layers}
    image = compose_manifest(
        project_dir,
        json.loads(manifest.model_dump_json()),
        transforms,
        transparent=request.transparent_background,
    )
    output_path = project_dir / "compositions" / "server_composite.png"
    image.save(output_path)
    return ComposeResponse(output_url=storage.asset_url(project_id, "compositions", "server_composite.png"))


@app.get("/api/projects/{project_id}/package")
def download_package(project_id: str):
    try:
        package_path = storage.build_layer_package(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found.") from exc
    return FileResponse(package_path, filename=f"imagelayeragent-{project_id}.zip")


def _try_load_manifest(project_id: str) -> ImageManifest | None:
    try:
        return storage.load_manifest(project_id)
    except FileNotFoundError:
        return None


def _load_or_analyze_project(project_id: str, require_ocr: bool = False) -> ImageManifest:
    manifest = _try_load_manifest(project_id)
    if manifest is not None and (not require_ocr or _manifest_has_ocr_pass(manifest)):
        return manifest
    providers = build_provider_registry(settings_store.load())
    if require_ocr and providers.ocr is None:
        raise RuntimeError("PaddleOCR is required for replacement workflow. Please configure PaddleOCR in settings or .env.")
    analyzer = LayerAnalyzer(storage, providers, human_parser=human_parser)
    return analyzer.analyze(project_id)


def _manifest_has_ocr_pass(manifest: ImageManifest) -> bool:
    return any("OCR provider recognized" in warning for warning in manifest.warnings)


@app.get("/assets/{project_id}/{path:path}")
def get_asset(project_id: str, path: str):
    try:
        project_dir = storage.require_project_dir(project_id).resolve()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found.") from exc
    file_path = (project_dir / path).resolve()
    if not str(file_path).startswith(str(project_dir)):
        raise HTTPException(status_code=403, detail="Invalid asset path.")
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Asset not found.")
    return FileResponse(file_path)

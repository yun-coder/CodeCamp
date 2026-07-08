from __future__ import annotations

from pathlib import Path
import asyncio
import os

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import database
from .analyzer import analyze_repository
from .jobs import create_job, get_job, sse
from .llm import generate_report, stream_answer
from .repository import clone_repo, normalize_repo_url, remove_tree, repo_path
from .schemas import AnalyzeRequest, AnalyzeResponse, ChatRequest

_PORT = int(os.getenv("PROJECT_HELPER_PORT", "8000"))
_STATIC_DIR = os.getenv("PROJECT_HELPER_STATIC_DIR", "")

app = FastAPI(title="project-helper API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        f"http://127.0.0.1:{_PORT}",
        f"http://localhost:{_PORT}",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    database.init_db()


async def run_analysis(job_id: str, repo_url: str, force_checkout: bool = False) -> None:
    job = get_job(job_id)
    if job is None:
        return
    try:
        await job.publish("progress", "校验 GitHub 地址")
        normalized_url, repo_key, repo_name = normalize_repo_url(repo_url)
        target = repo_path(repo_key)
        project_id = database.create_or_update_project(
            repo_url=normalized_url,
            repo_key=repo_key,
            repo_name=repo_name,
            local_path=target,
            status="analyzing",
        )
        job.project_id = project_id
        await job.publish("project", "项目记录已创建", project_id=project_id, repo_name=repo_name)

        await job.publish("progress", "克隆仓库或复用本地缓存")
        if force_checkout and target.exists():
            await job.publish("progress", "清理旧缓存，重新拉取仓库")
            await asyncio.to_thread(remove_tree, target)
        await asyncio.to_thread(clone_repo, normalized_url, target)

        await job.publish("progress", "扫描目录结构、依赖和关键文件")
        summary = await asyncio.to_thread(analyze_repository, target)

        await job.publish("progress", "生成通俗易懂的源码学习报告")
        report_md = await generate_report(repo_name, summary)
        database.save_report(project_id, report_md, summary)

        job.status = "done"
        await job.publish("done", "分析完成", project_id=project_id, report_md=report_md)
    except Exception as exc:  # noqa: BLE001 - error is streamed to user
        job.status = "failed"
        if job.project_id:
            database.mark_failed(job.project_id, str(exc))
        await job.publish("error", str(exc))


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/projects")
def projects() -> list[dict]:
    return database.list_projects()


@app.get("/api/projects/{project_id}")
def project(project_id: int) -> dict:
    item = database.find_project(project_id)
    if not item:
        raise HTTPException(status_code=404, detail="项目不存在")
    return item


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, remove_files: bool = True) -> dict[str, str]:
    item = database.delete_project(project_id)
    if not item:
        raise HTTPException(status_code=404, detail="项目不存在")
    if remove_files and item.get("local_path"):
        root = repo_path(item["repo_key"]).parent.resolve()
        target = Path(item["local_path"]).resolve()
        if str(target).startswith(str(root)) and target.exists():
            remove_tree(target)
    return {"status": "deleted"}


@app.post("/api/projects/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest, background_tasks: BackgroundTasks) -> AnalyzeResponse:
    try:
        normalized_url, repo_key, _ = normalize_repo_url(request.repo_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    cached = database.find_project_by_key(repo_key)
    if not request.force and cached and cached.get("status") == "ready" and cached.get("report_md"):
        return AnalyzeResponse(
            project_id=cached["id"],
            cached=True,
            status="ready",
            report_md=cached["report_md"],
        )
    job = create_job()
    background_tasks.add_task(run_analysis, job.id, normalized_url, request.force)
    return AnalyzeResponse(job_id=job.id, cached=False, status="queued")


@app.get("/api/jobs/{job_id}/events")
async def job_events(job_id: str) -> StreamingResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="任务不存在")

    async def event_stream():
        for event in job.events:
            yield sse(event, event=event.get("event", "message"))
        while job.status not in {"done", "failed"}:
            try:
                event = await asyncio.wait_for(job.queue.get(), timeout=12)
                yield sse(event, event=event.get("event", "message"))
            except asyncio.TimeoutError:
                yield ": ping\n\n"
        while not job.queue.empty():
            event = await job.queue.get()
            yield sse(event, event=event.get("event", "message"))

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class ConfigUpdate(BaseModel):
    deepseek_api_key: str


@app.get("/api/config")
def get_config() -> dict:
    from .config import get_settings
    s = get_settings()
    return {
        "has_api_key": bool(s.deepseek_api_key),
        "deepseek_model": s.deepseek_model,
        "deepseek_base_url": s.deepseek_base_url,
    }


@app.put("/api/config")
def update_config(cfg: ConfigUpdate) -> dict:
    import os as _os
    from .config import get_settings
    settings = get_settings()
    env_path = settings.env_file
    lines: list[str] = []
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()
    found = False
    for i, line in enumerate(lines):
        if line.strip().startswith("DEEPSEEK_API_KEY="):
            lines[i] = f"DEEPSEEK_API_KEY={cfg.deepseek_api_key}"
            found = True
            break
    if not found:
        lines.append(f"DEEPSEEK_API_KEY={cfg.deepseek_api_key}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    # Apply immediately without restart
    _os.environ["DEEPSEEK_API_KEY"] = cfg.deepseek_api_key
    get_settings.cache_clear()
    return {"status": "updated"}


# Static file serving — MUST be last (catch-all for SPA routing)
if _STATIC_DIR:
    _sp = Path(_STATIC_DIR)
    if _sp.exists() and (_sp / "index.html").exists():
        app.mount("/", StaticFiles(directory=str(_sp), html=True), name="frontend")

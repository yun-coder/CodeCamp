"""
intentos.server
===============

FastAPI 服务入口。三个职责：

1. /             - 返回前端 SPA
2. /api/intent   - 用户意图入口：调 LLM 流式 + 触发场景，组合 SSE 推给前端
3. /api/boot     - 开机时调用，OS 主动续接
4. /api/scenarios- 列出所有可用场景（前端动态生成 quick-intent 按钮）
5. /static/*     - 静态资源

架构选择：
- 单端口 SPA：FastAPI 同时管后端 API + 前端静态，避免跨域/CORS 配置。
- 流式传输用 SSE（Server-Sent Events），浏览器原生 EventSource 就够用。
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .config import get_settings
from .llm import create_client, scripted_reply, stream_chat
from .scenarios import SCENARIOS, Scenario, all_scenarios_for_demo, route

logger = logging.getLogger("intentos.server")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")

# ------------------------------------------------------------------
# FastAPI app
# ------------------------------------------------------------------
app = FastAPI(
    title="IntentOS",
    description="AI-first OS demo · AutoGen 0.4 + MiniMax",
    version="0.1.0",
)

# 前端目录（HTML / CSS / JS）
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
STATIC_DIR = FRONTEND_DIR / "static"

# 把 /static 挂在 /static 下
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ------------------------------------------------------------------
# 数据模型
# ------------------------------------------------------------------
class IntentRequest(BaseModel):
    """前端发来的意图请求。"""

    prompt: str  # 用户的自然语言意图
    history: list[dict] = []  # 之前的对话历史（让 LLM 有上下文）


class BootResponse(BaseModel):
    """开机接口返回。"""

    welcome_html: str  # 主动续接的画布 HTML
    ai_message: str  # OS 主动说的一段话（已经流式推过的最终版）
    sources: list[dict]
    activity: list[str]


# ------------------------------------------------------------------
# 路由：根路径 -> 前端 SPA
# ------------------------------------------------------------------
@app.get("/")
async def index() -> FileResponse:
    """返回前端入口。"""
    index_path = FRONTEND_DIR / "templates" / "index.html"
    if not index_path.exists():
        raise HTTPException(404, "frontend not found")
    return FileResponse(index_path)


# ------------------------------------------------------------------
# 路由：列出所有场景（前端用来生成 quick-intent 按钮）
# ------------------------------------------------------------------
@app.get("/api/scenarios")
async def list_scenarios() -> dict:
    """返回所有可演示场景的清单，供前端动态渲染。"""
    return {
        "scenarios": [
            {
                "id": s.id,
                "title": s.title,
                "description": s.description,
                "tag": s.tag,
                "triggers": s.triggers[:2],  # 只给前端看 2 个，避免泄露内部关键词
            }
            for s in SCENARIOS
        ]
    }


# ------------------------------------------------------------------
# 路由：开机（主动续接）
# ------------------------------------------------------------------
@app.get("/api/boot", response_model=BootResponse)
async def boot() -> BootResponse:
    """开机时被前端调用，OS 主动续接上次工作。"""
    welcome = next(s for s in SCENARIOS if s.id == "welcome")
    ai_msg = await _llm_or_script(
        "用户刚开机。请用中文（< 80 字）告诉用户你还记得他 3 天前的工作，"
        "并列出 3 件你注意到他离开期间发生的事。语气像老朋友，不寒暄。",
        fallback="欢迎回来。我帮你保住了 3 天前那份 Q3 财报草稿。期间小李在 §2 留了 2 条评论，明天 15:00 还有个日历冲突，要先处理哪一件？",
    )
    return BootResponse(
        welcome_html=welcome.canvas_html,
        ai_message=ai_msg,
        sources=welcome.sources,
        activity=welcome.activity,
    )


# ------------------------------------------------------------------
# 路由：处理意图（核心接口）
# ------------------------------------------------------------------
@app.post("/api/intent")
async def handle_intent(req: IntentRequest) -> StreamingResponse:
    """处理用户意图，SSE 流式返回。

    SSE 事件格式：
      event: chunk       data: {"text": "..."}        # LLM 流式文字片段
      event: scenario    data: {"scenario": {...}}     # 触发的场景元数据
      event: done        data: {"ok": true}
      event: error       data: {"message": "..."}
    """
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(400, "prompt is empty")

    scenario = route(prompt)
    logger.info("intent=%r -> scenario=%s", prompt[:40], scenario.id if scenario else None)

    return StreamingResponse(
        _stream_intent(prompt, scenario),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # 关闭 nginx buffer（本地开发用不上，写给生产部署的人看）
        },
    )


async def _stream_intent(prompt: str, scenario: Scenario | None) -> AsyncIterator[str]:
    """实际生成 SSE 事件的异步生成器。"""
    try:
        # 1. 流式生成 LLM 文字
        async for chunk in _llm_stream(prompt):
            yield _sse("chunk", {"text": chunk})

        # 2. 推送触发的场景元数据
        if scenario:
            yield _sse(
                "scenario",
                {
                    "id": scenario.id,
                    "title": scenario.title,
                    "tag": scenario.tag,
                    "canvas_html": scenario.canvas_html,
                    "sources": scenario.sources,
                    "activity": scenario.activity,
                },
            )

        # 3. 结束
        yield _sse("done", {"ok": True})
    except asyncio.CancelledError:
        logger.info("client disconnected mid-stream")
        raise
    except Exception as e:
        logger.exception("stream_intent failed")
        yield _sse("error", {"message": str(e)})


def _sse(event: str, data: dict) -> str:
    """格式化一个 SSE 事件（多行 data 会被协议拆分，这里我们只用单行 JSON）。"""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# ------------------------------------------------------------------
# 内部：LLM 流式（带容灾）
# ------------------------------------------------------------------
async def _llm_stream(prompt: str) -> AsyncIterator[str]:
    """调真实 LLM 流式输出，失败时回退到剧本。"""
    settings = get_settings()

    if not settings.USE_REAL_LLM or not settings.MINIMAX_API_KEY:
        # 剧本模式
        for ch in scripted_reply(prompt):
            await asyncio.sleep(0.012)
            yield ch
        return

    # 真实 LLM 模式
    try:
        client = create_client(settings)
        # 把"用户 prompt + 角色指令"一起传给 LLM
        full_prompt = (
            f"用户说：{prompt}\n\n"
            "请用 1-2 句中文回复，< 80 字，直接说结果，不要寒暄。"
            "如果需要分点用换行。"
        )
        async for chunk in stream_chat(full_prompt, client=client):
            yield chunk
    except Exception as e:
        logger.warning("LLM call failed, fallback to script: %s", e)
        for ch in scripted_reply(prompt):
            await asyncio.sleep(0.012)
            yield ch


async def _llm_or_script(prompt: str, fallback: str) -> str:
    """非流式版本：拿一个完整的 LLM 回复，失败用剧本。"""
    settings = get_settings()
    if not settings.USE_REAL_LLM or not settings.MINIMAX_API_KEY:
        return fallback
    try:
        client = create_client(settings)
        buf = []
        async for chunk in stream_chat(prompt, client=client):
            buf.append(chunk)
        return "".join(buf) or fallback
    except Exception as e:
        logger.warning("LLM call failed: %s", e)
        return fallback


# ------------------------------------------------------------------
# 路由：健康检查
# ------------------------------------------------------------------
@app.get("/api/health")
async def health() -> dict:
    """供前端显示 IntentOS 是否在跑。"""
    s = get_settings()
    return {
        "ok": True,
        "model": s.MINIMAX_MODEL,
        "real_llm": bool(s.USE_REAL_LLM and s.MINIMAX_API_KEY),
        "timestamp": time.time(),
    }


# ------------------------------------------------------------------
# 入口
# ------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    s = get_settings()
    uvicorn.run(
        "intentos.server:app",
        host=s.HOST,
        port=s.PORT,
        reload=False,
        log_level="info",
    )

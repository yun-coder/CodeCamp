"""``/api/agent/*`` — multi-step agent chat and orchestration.

A minimal implementation: the agent is a thin wrapper that forwards to
``pixelforge.agents.orchestrator.Orchestrator``. Per-project conversation
state is persisted under ``<project_dir>/agent_messages.json``.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/agent", tags=["agent"])


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1)


class AgentMessage(BaseModel):
    role: str
    content: str


class AgentChatResponse(BaseModel):
    available: bool
    reply: str
    messages: list[AgentMessage] = Field(default_factory=list)


def _messages_path(storage, project_id: str) -> Path:
    return storage.require_project_dir(project_id) / "agent_messages.json"


def _load_messages(storage, project_id: str) -> list[AgentMessage]:
    path = _messages_path(storage, project_id)
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return [AgentMessage(**m) for m in data if isinstance(m, dict)]


def _save_messages(storage, project_id: str, messages: list[AgentMessage]) -> None:
    path = _messages_path(storage, project_id)
    path.write_text(
        json.dumps([m.model_dump() for m in messages], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


@router.get("/status")
def agent_status(request: Request) -> dict[str, Any]:
    return {
        "available": True,
        "providers": request.app.state.providers.details,
    }


@router.get("/{project_id}/messages", response_model=list[AgentMessage])
def list_messages(project_id: str, request: Request) -> list[AgentMessage]:
    storage = request.app.state.storage
    try:
        return _load_messages(storage, project_id)
    except FileNotFoundError as exc:
        raise HTTPException(404, "Project not found.") from exc


@router.post("/{project_id}/chat", response_model=AgentChatResponse)
def chat(project_id: str, payload: AgentChatRequest, request: Request) -> AgentChatResponse:
    storage = request.app.state.storage
    try:
        messages = _load_messages(storage, project_id)
    except FileNotFoundError as exc:
        raise HTTPException(404, "Project not found.") from exc
    user_msg = AgentMessage(role="user", content=payload.message)
    messages.append(user_msg)
    # Minimal stub: echo + append a non-AI acknowledgement. Real Agent
    # logic (VLM tool use, retries) lands in a later release.
    reply_msg = AgentMessage(
        role="assistant",
        content=(
            f"已收到：{payload.message!r}。"
            "（Agent 自动规划正在 Phase 4+ 推进，当前返回 echo 占位。）"
        ),
    )
    messages.append(reply_msg)
    _save_messages(storage, project_id, messages)
    return AgentChatResponse(
        available=True,
        reply=reply_msg.content,
        messages=messages,
    )

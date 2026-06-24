#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
agnes_client.py — Agnes API 客户端(对应橙皮书 §04 零件四 · Connectors)

用法:
  from agnes_client import chat, is_configured
  if is_configured():
      resp = chat([{"role": "user", "content": "..."}])
  else:
      resp = chat([...], mock=True)

环境变量:
  AGNES_API_KEY       你的 Agnes API Key(必填走真实)
  AGNES_BASE_URL      默认 https://apihub.agnes-ai.com/v1
  AGNES_MODEL         默认 agnes-2.0-flash

Mock 模式:AGNES_API_KEY 未设时自动走 mock
"""
from __future__ import annotations
import json
import os
import random
import string
from pathlib import Path
from typing import Any

import httpx

# 自动加载 .env(在本文件同级的 .. 目录,也就是 loop-engineering/.env)
try:
    from dotenv import load_dotenv
    _ENV_PATH = Path(__file__).resolve().parent.parent / '.env'
    if _ENV_PATH.exists():
        load_dotenv(_ENV_PATH, override=False)
except ImportError:
    # 没有 python-dotenv 也行,自己简单解析
    _ENV_PATH = Path(__file__).resolve().parent.parent / '.env'
    if _ENV_PATH.exists():
        for line in _ENV_PATH.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


def _get_env(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


def is_configured() -> bool:
    return bool(_get_env("AGNES_API_KEY"))


def get_config() -> dict:
    return {
        "api_key": _get_env("AGNES_API_KEY"),
        "base_url": _get_env("AGNES_BASE_URL", "https://apihub.agnes-ai.com/v1"),
        "model": _get_env("AGNES_MODEL", "agnes-2.0-flash"),
    }


_MOCK_FILE_TEMPLATES = {
    "review": (
        "# {title} - 复盘结论\n\n"
        "## 我现在还信不信的判断\n\n"
        "1. **信**:{title} 仍然相关,核心观点未变\n"
        "2. **信**:对接入现有项目有实际价值\n"
        "3. **不信**:文档部分章节已过期,需要核对\n\n"
        "## 后续动作\n\n"
        "- 跑一次实测,验证文档里的代码示例仍可工作\n"
        "- 把过期章节标注出来,下个 commit 修正\n\n"
        "refs: {source}\n"
    ),
    "bookmark": (
        "# {title} - 架构要点\n\n"
        "## 核心架构\n\n"
        "1. 模块化设计,职责清晰\n"
        "2. 使用标准协议(MCP / OpenAI 兼容)\n"
        "3. 重视可观测性(trace / log / metric)\n\n"
        "## 对我的启示\n\n"
        "- 借鉴它的模块边界划分\n"
        "- 接进现有项目时按它的协议来\n\n"
        "refs: {source}\n"
    ),
}


def _mock_chat(messages, max_tokens):
    last = next((m for m in reversed(messages) if m["role"] == "user"), {})
    content = last.get("content", "")

    if "复盘" in content or "review" in content.lower():
        kind = "review"
        title_match = next(
            (line for line in content.split("\n") if line.startswith("# ")), "未命名"
        )
        title = title_match[2:].strip() or "未知 KB"
    else:
        kind = "bookmark"
        for line in content.split("\n"):
            if "https://" in line or "http://" in line:
                title = line.strip()[:50]
                break
        else:
            title = "AI 资源"

    source = "inbox"
    for line in content.split("\n"):
        if line.strip().startswith("https://") or line.strip().startswith("http://"):
            source = line.strip()
            break

    project = "我的项目"
    for proj in ("Yunspire", "loop-engineering", "agent_platform"):
        if proj in content:
            project = proj
            break

    body = _MOCK_FILE_TEMPLATES[kind].format(
        title=title, project=project, source=source
    )

    structured_response = json.dumps({
        "action": "create_file",
        "path": f"src/{kind}-notes.md",
        "content": body,
        "commit_message": (
            f"docs: {title} 提炼要点\n\n"
            f"because: 通过 {kind} 任务,需要把外部信息转为 KB 资产\n"
            f"so that: 后续 agent_platform 接入时少走弯路\n\n"
            f"refs: {source}\n"
            f"refs: mock-mode\n\n"
            f"Co-Authored-By: Agnes (mock) <noreply@agnes-ai.local>"
        ),
    }, ensure_ascii=False)

    return {
        "id": "mock-" + "".join(random.choices(string.ascii_lowercase, k=8)),
        "object": "chat.completion",
        "model": "mock-agnes",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": structured_response},
            "finish_reason": "stop",
        }],
        "usage": {"prompt_tokens": 200, "completion_tokens": 300, "total_tokens": 500},
    }


def _real_chat(messages, max_tokens, temperature):
    cfg = get_config()
    payload = {
        "model": cfg["model"],
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    r = httpx.post(
        f"{cfg['base_url']}/chat/completions",
        headers={
            "Authorization": f"Bearer {cfg['api_key']}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=120.0,
    )
    r.raise_for_status()
    return r.json()


def chat(messages, max_tokens=4000, temperature=0.3, mock=None):
    if mock is None:
        mock = not is_configured()
    if mock:
        return _mock_chat(messages, max_tokens)
    return _real_chat(messages, max_tokens, temperature)


def get_text(resp):
    return resp["choices"][0]["message"]["content"]


if __name__ == "__main__":
    print(f"configured: {is_configured()}")
    print(f"base_url:   {get_config()['base_url']}")
    print(f"model:      {get_config()['model']}")
    resp = chat([
        {"role": "system", "content": "你是 Agnes。"},
        {"role": "user", "content": "说 hello。"},
    ])
    print("--- response ---")
    print(get_text(resp)[:200])

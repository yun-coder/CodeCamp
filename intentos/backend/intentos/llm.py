"""
intentos.llm
============

LLM 客户端薄封装。

设计：
- 不直接暴露 autogen_ext 给上层，上层只看到"流式拿到字符"的接口。
- 这样未来要换 LangChain / LlamaIndex / 直接 OpenAI SDK 都只动这一文件。
- 支持"剧本 fallback"：当 USE_REAL_LLM=False 或者 API 失败时，
  返回预设的中文回复，确保 demo 永不挂。
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from typing import AsyncIterator, Optional

from autogen_agentchat.agents import AssistantAgent
from autogen_core.models import ModelInfo
from autogen_ext.models.openai import OpenAIChatCompletionClient

from .config import Settings, get_settings

logger = logging.getLogger("intentos.llm")


# ------------------------------------------------------------------
# MiniMax model_info 适配
# ------------------------------------------------------------------
# AutoGen 0.4 要求 OpenAI 兼容客户端显式提供 model_info。
# MiniMax 不提供 vision / function calling 的标准子集，
# 但提供 chat completion（流式）和 function calling。
def _build_model_info() -> ModelInfo:
    """构造 AutoGen 需要的 ModelInfo 字典。

    MiniMax-M3 实际能力（根据 2026-06 时点观察）：
    - ✅ chat completion
    - ✅ 流式输出
    - ✅ function calling（tool use）
    - ✅ system prompt
    - ❌ vision（不在主模型上）
    - ❌ JSON mode（不一定稳定）
    """
    return ModelInfo(
        family="minimax",
        vision=False,
        function_calling=True,
        json_output=False,
        structured_output=False,
        context_window=128_000,
    )


# ------------------------------------------------------------------
# 客户端工厂
# ------------------------------------------------------------------
def create_client(settings: Optional[Settings] = None) -> OpenAIChatCompletionClient:
    """构造一个 OpenAI 兼容客户端，指向 MiniMax。"""
    s = settings or get_settings()
    if not s.MINIMAX_API_KEY:
        raise RuntimeError(
            "MINIMAX_API_KEY 未配置。请把 MiniMax key 写到 .env 或环境变量。"
        )
    return OpenAIChatCompletionClient(
        model=s.MINIMAX_MODEL,
        base_url=s.MINIMAX_BASE_URL,
        api_key=s.MINIMAX_API_KEY,
        model_info=_build_model_info(),
        max_tokens=s.LLM_MAX_TOKENS,
        timeout=s.LLM_TIMEOUT,
    )


# ------------------------------------------------------------------
# Agent 工厂
# ------------------------------------------------------------------
def create_os_agent(
    client: OpenAIChatCompletionClient,
    system_prompt: Optional[str] = None,
) -> AssistantAgent:
    """创建 IntentOS 的"内核人格" agent。

    它就是 OS 本身——没有第二个 agent。
    在 AutoGen 0.4 里，最小可用的就是 AssistantAgent + 一次 on_messages 调用。
    """
    s = get_settings()
    sys_prompt = system_prompt or s.SYSTEM_PROMPT
    return AssistantAgent(
        name="intentos",
        model_client=client,
        system_message=sys_prompt,
        # 不开 reflect_on_tool_use：我们要的是"流式说人话"，不是工具循环
        reflect_on_tool_use=False,
    )


# ------------------------------------------------------------------
# 剧本 fallback（demo 容灾）
# ------------------------------------------------------------------
_SCRIPTED_REPLIES = {
    "继续": (
        "已恢复上周三的草稿。Q3 财报分析文档，"
        "小李在 §2 segment breakdown 留了 2 条评论。"
    ),
    "京都": (
        "在 24,891 张照片里搜到 4 张匹配。"
        "置信度最高的是 2025-04-02 在哲学之道拍的那张。"
    ),
    "重写": (
        "好。已划掉原文，新版本更悲观，"
        "把 enterprise segment 的下滑从'季节性'改写为'结构性'。"
    ),
    "邮件": (
        "邮件已写好草稿。注意到明天 14:30 你有 standup，"
        "建议把会议改到 15:15。需要我执行吗？"
    ),
    "周": (
        "这周：上线 2 个 feature，审了 14 个 PR，"
        "写了 2.1k 行代码，开了 6.5 小时会，"
        "还跳了 2 次健身房。要不要起草一份周报？"
    ),
    "出差": (
        "下周上海出差已规划完毕："
        "周二早班机 7:30、虹桥附近酒店、"
        "周三 3 场客户会议。是否要把行程发到家庭群？"
    ),
    "相册": (
        "翻到你 2023 年云南大理的 142 张照片。"
        "已挑出 23 张构图最好的，做成了一本 12 页的电子相册。"
    ),
    "购物车": (
        "老婆的购物车里这周多了 3 件商品："
        "一件风衣、一套护肤、一本摄影集。"
        "我注意到她上周在朋友圈点赞过类似的风衣——"
        "是否要悄悄下单？"
    ),
}


def scripted_reply(prompt: str) -> str:
    """根据 prompt 关键词返回一个预设中文回复（fallback 用）。"""
    for k, v in _SCRIPTED_REPLIES.items():
        if k in prompt:
            return v
    return "已收到。当前在剧本模式，真实 LLM 未启用。"


# ------------------------------------------------------------------
# 流式聊天：把 AutoGen 0.4 的 on_messages 包装成字符流
# ------------------------------------------------------------------
async def stream_chat(
    prompt: str,
    *,
    client: Optional[OpenAIChatCompletionClient] = None,
    system_prompt: Optional[str] = None,
) -> AsyncIterator[str]:
    """把用户 prompt 喂给 OS agent，逐字符 yield。

    这是整个 backend 对前端最关键的接口——前端 SSE 接到字符就立刻渲染。

    Args:
        prompt: 用户的意图文本
        client: 复用已有客户端（None 则新建）
        system_prompt: 覆盖默认人格

    Yields:
        字符串片段（一个 chunk = 几~几十字符）
    """
    s = get_settings()

    # ---- 离线 / 容灾分支 ----
    if not s.USE_REAL_LLM or not s.MINIMAX_API_KEY:
        for ch in scripted_reply(prompt):
            await asyncio.sleep(0.012)  # ~80 char/sec，模拟真人打字
            yield ch
        return

    # ---- 真实 LLM 分支 ----
    # 用底层 model client 的 create_stream 直接拿 str chunks。
    # 为什么不用 AssistantAgent.on_messages_stream？
    #   - AssistantAgent 会自动把 user message 加入对话历史，需要 to_model_message()；
    #   - autogen 0.7.5 的 BaseChatMessage.to_model_message 在某些路径上会抛错；
    #   - 我们的需求很明确：一次性的 chat completion + 流式 text out，
    #     完全不需要 agent 的"对话历史/工具"能力，所以直接调底层更稳。
    from autogen_core.models import (
        AssistantMessage,
        LLMMessage,
        SystemMessage,
        UserMessage,
    )

    # 组装 messages：system + user
    sys_msg = SystemMessage(content=system_prompt or get_settings().SYSTEM_PROMPT)
    usr_msg = UserMessage(content=prompt, source="user")
    messages: list[LLMMessage] = [sys_msg, usr_msg]

    # 调底层 client 的 create_stream
    import re as _re
    # 缓存区：MiniMax 内部会把 <think>...</think> 整块作为最后一个 chunk 吐出来，
    # 但它的内部 chunk 边界和我们的流式策略不一致。
    # 我们在客户端做"延迟 emit"：攒到看到 </think> 再决定是否去掉。
    in_think = False
    pending = ""
    flush = ""
    async for ev in client.create_stream(messages=messages):
        if isinstance(ev, str):
            if not ev:
                continue
            pending += ev
            # 简单状态机：剥掉 <think>...</think> 块
            while True:
                if in_think:
                    end = pending.find("</think>")
                    if end < 0:
                        # 还在 think 中，先保留（不 yield），等下一个 chunk
                        break
                    pending = pending[end + len("</think>"):]
                    in_think = False
                    continue
                start = pending.find("<think>")
                if start < 0:
                    flush += pending
                    pending = ""
                    break
                # 之前部分先 flush
                flush += pending[:start]
                pending = pending[start + len("<think>"):]
                in_think = True
            if flush and flush.strip():
                yield flush
                flush = ""
        # 忽略非 str 的 CreateResult（最后的事件，content 是完整结果，但我们已经流式 yield 过了）


def _normalize_chunk(chunk) -> str:
    """AutoGen 的 chunk 可能是 str、ChatCompletionChunk、或有 .content 字段的对象。"""
    if isinstance(chunk, str):
        return chunk
    # 兼容 pydantic 模型 / dataclass
    for attr in ("content", "text", "delta"):
        v = getattr(chunk, attr, None)
        if isinstance(v, str):
            return v
    return str(chunk)

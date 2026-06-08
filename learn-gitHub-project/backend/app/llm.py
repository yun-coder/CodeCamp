from __future__ import annotations

from pathlib import Path
from typing import AsyncIterator
import asyncio
import json

from .analyzer import fallback_report, safe_read, walk_files
from .config import get_settings


SYSTEM_REPORT_PROMPT = """你是 project-helper，一个极其会讲源码的项目学习助手。
你的目标是让没有背景的新手也能读懂项目。请用中文输出完整 Markdown 报告。
必须覆盖：项目概述、技术栈、目录结构、核心模块、关键数据流、设计模式/架构思想、启动方式、阅读建议、可继续追问的问题。
讲解要通俗，但不要胡编；不确定的地方明确标注为“推测”。代码文件名必须用反引号。"""


def has_llm() -> bool:
    return bool(get_settings().deepseek_api_key)


def get_model(streaming: bool = False):
    settings = get_settings()
    try:
        from langchain_openai import ChatOpenAI
    except ImportError as exc:
        raise RuntimeError("缺少 langchain-openai，请先安装 backend/requirements.txt") from exc
    kwargs = {
        "model": settings.deepseek_model,
        "api_key": settings.deepseek_api_key,
        "base_url": settings.deepseek_base_url,
        "temperature": 0.2,
        "streaming": streaming,
        "timeout": settings.deepseek_timeout,
        "max_retries": settings.deepseek_max_retries,
    }
    if settings.deepseek_max_tokens > 0:
        kwargs["max_tokens"] = settings.deepseek_max_tokens
    return ChatOpenAI(**kwargs)


def compact_summary(
    summary: dict,
    *,
    max_chars: int | None = None,
    max_key_files: int | None = None,
    key_file_chars: int | None = None,
) -> str:
    settings = get_settings()
    max_chars = max_chars or settings.report_context_chars
    max_key_files = max_key_files or settings.report_key_files
    key_file_chars = key_file_chars or settings.report_key_file_chars
    payload = {
        "file_count": summary.get("file_count"),
        "total_lines": summary.get("total_lines"),
        "languages": summary.get("languages"),
        "tree": str(summary.get("tree") or "")[:8000],
        "dependencies": summary.get("dependencies") or {},
        "scan_note": "For large repositories, key file contents are intentionally sampled and truncated.",
    }
    payload["key_files"] = [
        {"path": item["path"], "content": item["content"][:key_file_chars]}
        for item in summary.get("key_files", [])[:max_key_files]
    ]
    return json.dumps(payload, ensure_ascii=False, indent=2)[:max_chars]


async def generate_report(repo_name: str, summary: dict) -> str:
    if not has_llm():
        return fallback_report(repo_name, summary)
    settings = get_settings()
    try:
        model = get_model(streaming=False)
        context_options = [
            {
                "max_chars": settings.report_context_chars,
                "max_key_files": settings.report_key_files,
                "key_file_chars": settings.report_key_file_chars,
            },
            {
                "max_chars": min(12000, settings.report_context_chars),
                "max_key_files": min(6, settings.report_key_files),
                "key_file_chars": min(900, settings.report_key_file_chars),
            },
        ]
        last_exc: Exception | None = None
        for index, option in enumerate(context_options, start=1):
            try:
                messages = [
                    ("system", SYSTEM_REPORT_PROMPT),
                    (
                        "user",
                        "仓库："
                        f"{repo_name}\n\n"
                        f"这是第 {index} 次报告生成尝试。下面是自动扫描摘要，请基于它生成完整源码学习报告。"
                        "如果摘要被截断，请明确标注推测，优先讲清项目用途、技术栈、目录、核心模块和阅读路线：\n\n"
                        f"{compact_summary(summary, **option)}",
                    ),
                ]
                response = await model.ainvoke(messages)
                return str(response.content)
            except Exception as exc:  # noqa: BLE001 - retry with smaller context, then fall back
                last_exc = exc
                continue
        if last_exc:
            raise last_exc
        return fallback_report(repo_name, summary)
    except Exception as exc:  # noqa: BLE001 - keep analysis usable if the model endpoint is unavailable
        report = fallback_report(repo_name, summary)
        return (
            "> DeepSeek 调用暂时不可用，已自动降级为本地静态分析报告。\n"
            f"> 错误摘要：{type(exc).__name__}: {str(exc)[:300]}\n\n"
            f"{report}"
        )


def search_code(root: Path, query: str, limit: int = 12) -> str:
    query = query.strip().lower()
    if not query:
        return "搜索词为空。"
    matches: list[str] = []
    for file in walk_files(root):
        text = safe_read(file)
        lower = text.lower()
        if query not in lower:
            continue
        rel = str(file.relative_to(root)).replace("\\", "/")
        for idx, line in enumerate(text.splitlines(), start=1):
            if query in line.lower():
                matches.append(f"{rel}:{idx}: {line.strip()[:220]}")
                break
        if len(matches) >= limit:
            break
    return "\n".join(matches) or "没有搜索到匹配代码。"


def read_file(root: Path, relative_path: str) -> str:
    target = (root / relative_path).resolve()
    if not str(target).startswith(str(root.resolve())):
        return "拒绝读取仓库外部文件。"
    if not target.exists() or not target.is_file():
        return f"文件不存在：{relative_path}"
    return safe_read(target, 24000)


def list_files(root: Path, limit: int = 160) -> str:
    files = [str(path.relative_to(root)).replace("\\", "/") for path in walk_files(root)[:limit]]
    return "\n".join(files)


def make_code_tools(root: Path):
    try:
        from langchain_core.tools import tool
    except ImportError:
        return []

    @tool
    def list_repository_files(limit: int = 160) -> str:
        """List source files in the repository. Use this before reading files."""
        return list_files(root, limit)

    @tool
    def search_repository_code(query: str, limit: int = 12) -> str:
        """Search repository code for a keyword, function name, class name, route, or concept."""
        return search_code(root, query, limit)

    @tool
    def read_repository_file(relative_path: str) -> str:
        """Read a repository file by relative path after locating it with list or search."""
        return read_file(root, relative_path)

    return [list_repository_files, search_repository_code, read_repository_file]


async def run_tool_agent(root: Path, question: str, report_md: str | None):
    from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage

    tools = make_code_tools(root)
    if not tools:
        return None
    model = get_model(streaming=False)
    tool_model = model.bind_tools(tools)
    tool_map = {item.name: item for item in tools}
    messages = [
        SystemMessage(
            content=(
                "你是 project-helper 的源码问答 Agent。你可以自主调用工具读取文件、搜索代码、列文件。"
                "先查证，再回答；回答中文通俗易懂，必须引用相关文件路径。"
            )
        ),
        HumanMessage(
            content=f"项目报告摘要：\n{(report_md or '')[:6000]}\n\n用户问题：{question}"
        ),
    ]
    for _ in range(5):
        ai_message = await tool_model.ainvoke(messages)
        messages.append(ai_message)
        tool_calls = getattr(ai_message, "tool_calls", None) or []
        if not tool_calls:
            return messages
        for call in tool_calls:
            selected = tool_map.get(call["name"])
            if selected is None:
                continue
            result = await asyncio.to_thread(selected.invoke, call.get("args", {}))
            messages.append(ToolMessage(content=str(result), tool_call_id=call["id"]))
    messages.append(HumanMessage(content="请基于以上工具结果给出最终答案，不要再调用工具。"))
    return messages


def build_question_context(root: Path, question: str) -> str:
    tokens = [
        token.strip("`'\".,:;()[]{}<>，。！？")
        for token in question.split()
        if len(token.strip()) >= 2
    ][:8]
    search_blocks = []
    for token in tokens[:4]:
        result = search_code(root, token, 6)
        if "没有搜索到" not in result:
            search_blocks.append(f"搜索 `{token}`：\n{result}")
    key_files = list_files(root, 80)
    return f"文件清单：\n{key_files}\n\n相关搜索：\n" + "\n\n".join(search_blocks)


async def stream_answer(root: Path, question: str, report_md: str | None) -> AsyncIterator[str]:
    async def yield_local_answer(reason: str | None = None) -> AsyncIterator[str]:
        context = build_question_context(root, question)
        prefix = ""
        if reason:
            prefix = f"DeepSeek 问答暂时不可用，已自动降级为本地源码检索回答。\n\n原因摘要：{reason[:300]}\n\n"
        answer = f"""{prefix}我已经查看了仓库文件清单，并围绕你的问题做了代码搜索。

```text
{context[:5000]}
```

你可以把上面的文件路径继续发给我，我会围绕具体文件进一步解释。"""
        for char in answer:
            yield char
            await asyncio.sleep(0.002)

    if not has_llm():
        async for chunk in yield_local_answer("未配置 DEEPSEEK_API_KEY"):
            yield chunk
        return

    try:
        messages = await run_tool_agent(root, question, report_md)
    except Exception as exc:  # noqa: BLE001
        context = build_question_context(root, question)
        messages = [
            (
                "system",
                "你是 project-helper 的源码问答 Agent。回答必须基于给定仓库上下文；不确定就说不确定。用中文，引用文件路径。",
            ),
            (
                "user",
                f"项目报告摘要：\n{(report_md or '')[:8000]}\n\n工具检索上下文：\n{context[:12000]}\n\n用户问题：{question}",
            ),
        ]
        messages.append(("user", f"上一次工具调用失败摘要：{type(exc).__name__}: {str(exc)[:300]}"))
    try:
        model = get_model(streaming=True)
        async for chunk in model.astream(messages):
            content = getattr(chunk, "content", "")
            if content:
                yield str(content)
    except Exception as exc:  # noqa: BLE001
        async for chunk in yield_local_answer(f"{type(exc).__name__}: {str(exc)}"):
            yield chunk

"""
intentos.config
===============

全局配置：从环境变量加载，所有模块共用。

设计要点：
- 全部用 Pydantic Settings，避免隐式默认值。
- 任何敏感字段（API Key）都只从环境变量读，绝不落盘。
- 配置项命名遵循"语义 > 来源"原则：MINIMAX_API_KEY 优先于 MINIMAX_CN_API_KEY。
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# ------------------------------------------------------------------
# 路径常量
# ------------------------------------------------------------------
# 项目根目录：backend/intentos/config.py -> ../../ -> backend -> ../../ -> 项目根
_BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = _BACKEND_DIR.parent


class Settings(BaseSettings):
    """运行时配置（单例）。

    字段命名约定：
    - *_KEY  : 必须是 secret，不在日志中打印
    - *_URL  : 网络端点
    - *_MODEL: 模型名
    """

    # -------------------- MiniMax 接入 --------------------
    # MiniMax 走 OpenAI 兼容协议，AutoGen 可以直接复用。
    # CN 域名是 minimaxi.com（mini-maxi），不是 minimax.cn。
    MINIMAX_API_KEY: str = Field(default="", description="MiniMax CN API key")
    MINIMAX_BASE_URL: str = Field(
        default="https://api.minimaxi.com/v1", description="OpenAI 兼容端点"
    )
    MINIMAX_MODEL: str = Field(
        default="MiniMax-M3", description="当前最新的 MiniMax 模型（也是 hermes 默认）"
    )

    # -------------------- 服务端 --------------------
    HOST: str = Field(default="127.0.0.1")
    PORT: int = Field(default=8765)

    # -------------------- 行为开关 --------------------
    # 是否启用真实 LLM（关闭则用脚本内置的剧本回复，便于离线演示）
    USE_REAL_LLM: bool = Field(default=True)
    # LLM 调用超时（秒）
    LLM_TIMEOUT: float = Field(default=60.0)
    # 单轮对话最大 token
    LLM_MAX_TOKENS: int = Field(default=2048)

    # -------------------- 人格 / 系统提示词 --------------------
    # IntentOS 的人格：在 system prompt 里描述。OS 把 LLM 当成"自己的人格"使用。
    SYSTEM_PROMPT: str = Field(
        default=(
            "你叫 IntentOS，是下一代 AI 优先操作系统的内核人格。"
            "用户用一个意图栏跟你交流，你要把模糊意图翻译成可执行结果。"
            "风格：极简、中文、像产品经理 + 高级工程师混合体。"
            "回复要短（< 80 字），除非用户在写文章。\n"
            "硬性约束：\n"
            "1. 永远不要让用户去「打开某个 app」——在你眼里，app 概念已死。\n"
            "2. 你的输出会作为 UI 卡片直接显示，要保留必要的换行符。\n"
            "3. 不要重复用户的话，不要寒暄。\n"
        )
    )

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),  # 项目根目录的 .env（如果存在）
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """获取配置单例（带 cache 避免重复读 .env）。"""
    # 如果根目录 .env 没有，尝试从 hermes 全局 .env 注入 key。
    s = Settings()
    if not s.MINIMAX_API_KEY:
        _try_load_from_hermes_env(s)
    return s


def _try_load_from_hermes_env(s: Settings) -> None:
    """如果项目根 .env 没配，回退读 hermes 全局 .env。

    这是为了复用用户已经在 Hermes 里配置好的 MiniMax key，
    避免要求用户重复配置。
    """
    hermes_env = Path(
        os.environ.get("APPDATA", str(Path.home())) + "/hermes/.env"
    )
    if not hermes_env.exists():
        return
    for line in hermes_env.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip()
        if k == "MINIMAX_CN_API_KEY" and not s.MINIMAX_API_KEY:
            # 用 chr 拼接避免日志/截断问题
            s.MINIMAX_API_KEY = v
        if k == "MINIMAX_BASE_URL" and s.MINIMAX_BASE_URL == "https://api.minimaxi.com/v1":
            s.MINIMAX_BASE_URL = v

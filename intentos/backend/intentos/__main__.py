"""
intentos.__main__
=================

支持 `python -m intentos` 直接启动服务。
"""

import uvicorn

from .config import get_settings


def main() -> None:
    s = get_settings()
    print(f"▣ IntentOS v0.1.0 starting on http://{s.HOST}:{s.PORT}")
    print(f"  model: {s.MINIMAX_MODEL}")
    print(f"  real_llm: {s.USE_REAL_LLM and bool(s.MINIMAX_API_KEY)}")
    uvicorn.run(
        "intentos.server:app",
        host=s.HOST,
        port=s.PORT,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()

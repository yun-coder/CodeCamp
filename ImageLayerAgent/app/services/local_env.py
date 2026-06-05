from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def load_local_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for filename in (".dev", ".env"):
        path = Path(filename)
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in values:
                values[key] = value
    return values


def env_value(*names: str, default: str | None = None) -> str | None:
    local_values = load_local_env()
    for name in names:
        value = os.environ.get(name)
        if value:
            return value
        value = local_values.get(name)
        if value:
            return value
    return default


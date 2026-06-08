from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any
import json
import os

from .config import get_settings


IGNORE_DIRS = {
    ".git",
    ".idea",
    ".vscode",
    "__pycache__",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".venv",
    "venv",
    "target",
    "coverage",
}

TEXT_EXTS = {
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".vue",
    ".java",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".cs",
    ".md",
    ".toml",
    ".yaml",
    ".yml",
    ".json",
    ".ini",
    ".cfg",
    ".txt",
    ".sql",
    ".html",
    ".css",
    ".scss",
}

TEXT_NAMES = {
    "README",
    "LICENSE",
    "LICENCE",
    "NOTICE",
    "CHANGELOG",
    "CONTRIBUTING",
    "Dockerfile",
    "Makefile",
}

LANG_BY_EXT = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript React",
    ".jsx": "React",
    ".vue": "Vue",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".rb": "Ruby",
    ".cs": "C#",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
}


def is_ignored(path: Path) -> bool:
    return any(part in IGNORE_DIRS for part in path.parts)


def safe_read(path: Path, max_bytes: int | None = None) -> str:
    max_bytes = max_bytes or get_settings().max_file_bytes
    try:
        data = path.read_bytes()[:max_bytes]
        return data.decode("utf-8", errors="replace")
    except OSError:
        return ""


def walk_files(root: Path) -> list[Path]:
    settings = get_settings()
    files: list[Path] = []
    for current, dirs, names in os.walk(root):
        current_path = Path(current)
        dirs[:] = [name for name in dirs if name not in IGNORE_DIRS]
        if is_ignored(current_path.relative_to(root)):
            continue
        for name in names:
            path = current_path / name
            rel = path.relative_to(root)
            if is_ignored(rel) or (path.suffix.lower() not in TEXT_EXTS and path.name not in TEXT_NAMES):
                continue
            try:
                if path.stat().st_size > settings.max_file_bytes:
                    continue
            except OSError:
                continue
            files.append(path)
            if len(files) >= settings.max_files:
                return files
    return files


def build_tree(root: Path, max_depth: int = 4, max_entries: int = 220) -> str:
    lines: list[str] = []
    count = 0

    def visit(path: Path, depth: int) -> None:
        nonlocal count
        if count >= max_entries or depth > max_depth:
            return
        entries = sorted(
            [entry for entry in path.iterdir() if entry.name not in IGNORE_DIRS],
            key=lambda item: (item.is_file(), item.name.lower()),
        )
        for entry in entries:
            if count >= max_entries:
                break
            rel = entry.relative_to(root)
            if is_ignored(rel):
                continue
            prefix = "  " * depth + ("└─ " if depth else "")
            suffix = "/" if entry.is_dir() else ""
            lines.append(f"{prefix}{entry.name}{suffix}")
            count += 1
            if entry.is_dir():
                visit(entry, depth + 1)

    visit(root, 0)
    if count >= max_entries:
        lines.append("...（目录较大，已截断）")
    return "\n".join(lines)


def detect_dependencies(root: Path) -> dict[str, Any]:
    deps: dict[str, Any] = {}
    package_json = root / "package.json"
    if package_json.exists():
        try:
            package = json.loads(safe_read(package_json))
            deps["npm"] = {
                "dependencies": sorted((package.get("dependencies") or {}).keys()),
                "devDependencies": sorted((package.get("devDependencies") or {}).keys()),
                "scripts": package.get("scripts") or {},
            }
        except json.JSONDecodeError:
            deps["npm"] = {"error": "package.json 无法解析"}
    requirements = root / "requirements.txt"
    if requirements.exists():
        deps["pip"] = [
            line.strip()
            for line in safe_read(requirements).splitlines()
            if line.strip() and not line.strip().startswith("#")
        ][:80]
    pyproject = root / "pyproject.toml"
    if pyproject.exists():
        deps["pyproject"] = safe_read(pyproject, 20000)
    return deps


def pick_key_files(root: Path, files: list[Path]) -> list[dict[str, str]]:
    priority_names = {
        "README",
        "README.md",
        "readme.md",
        "LICENSE",
        "Dockerfile",
        "Makefile",
        "package.json",
        "requirements.txt",
        "pyproject.toml",
        "main.py",
        "app.py",
        "server.py",
        "index.ts",
        "index.js",
        "main.ts",
        "main.js",
        "App.vue",
    }
    chosen: list[Path] = []
    for file in files:
        if file.name in priority_names:
            chosen.append(file)
    for file in files:
        rel = str(file.relative_to(root)).replace("\\", "/")
        if any(part in rel.lower() for part in ("src/", "app/", "api/", "routes/", "components/")):
            chosen.append(file)
        if len(chosen) >= 18:
            break
    unique: list[Path] = []
    seen: set[Path] = set()
    for file in chosen:
        if file not in seen:
            unique.append(file)
            seen.add(file)
    return [
        {
            "path": str(file.relative_to(root)).replace("\\", "/"),
            "content": safe_read(file, 9000),
        }
        for file in unique[:18]
    ]


def analyze_repository(root: Path) -> dict[str, Any]:
    files = walk_files(root)
    language_counts = Counter(LANG_BY_EXT.get(path.suffix.lower(), path.suffix.lower()) for path in files)
    total_lines = 0
    for path in files:
        total_lines += safe_read(path).count("\n") + 1
    summary = {
        "file_count": len(files),
        "total_lines": total_lines,
        "languages": dict(language_counts.most_common()),
        "tree": build_tree(root),
        "dependencies": detect_dependencies(root),
        "key_files": pick_key_files(root, files),
    }
    return summary


def fallback_report(repo_name: str, summary: dict[str, Any]) -> str:
    languages = ", ".join(f"{name}({count})" for name, count in summary["languages"].items()) or "暂未识别"
    deps = summary.get("dependencies") or {}
    key_files = "\n".join(f"- `{item['path']}`" for item in summary.get("key_files", [])[:12])
    return f"""# {repo_name} 源码学习报告

## 1. 项目概览

这个项目目前已完成本地静态扫描。如果 DeepSeek 未配置、模型不可用或接口暂时异常，系统会先生成这份规则版报告；DeepSeek 可用时会自动升级为 AI 深度讲解版。

- 文件数量：{summary['file_count']}
- 估算代码行数：{summary['total_lines']}
- 主要语言：{languages}

## 2. 技术栈初判

系统通过依赖文件、入口文件和源码后缀识别技术栈。下面是识别到的依赖线索：

```json
{json.dumps(deps, ensure_ascii=False, indent=2)[:4000]}
```

## 3. 目录结构

```text
{summary['tree']}
```

## 4. 建议优先阅读的文件

{key_files or "- 暂未找到明显入口文件，可以从 README 和根目录配置文件开始。"}

## 5. 傻瓜式阅读路线

1. 先看 README：搞清楚项目解决什么问题。
2. 再看依赖文件：判断它是前端、后端、CLI、库，还是混合项目。
3. 找入口文件：例如 `main.py`、`app.py`、`src/main.ts`、`package.json` scripts。
4. 顺着路由、服务、数据模型三条线看：谁接收请求，谁处理业务，谁读写数据。
5. 最后看测试：测试通常暴露“作者认为最重要的行为”。

## 6. 交互式问答建议

你可以继续问：

- “这个项目启动入口在哪里？”
- “用户请求从哪里进来，又流到哪里？”
- “帮我解释某个文件的作用”
- “这个项目适合新手先读哪些模块？”
"""

from __future__ import annotations

from pathlib import Path
from pathlib import PurePosixPath
from urllib.parse import urlparse
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess

from .config import get_settings


GITHUB_RE = re.compile(r"^(https://github\.com/[\w.-]+/[\w.-]+?)(?:\.git)?/?$")
VIRTUAL_MARKER = ".project-helper-virtual-checkout"
WINDOWS_INVALID_CHARS = re.compile(r'[<>:"\\|?*\x00-\x1f]')
WINDOWS_RESERVED_NAMES = {
    "CON",
    "PRN",
    "AUX",
    "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
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


def normalize_repo_url(repo_url: str) -> tuple[str, str, str]:
    raw = repo_url.strip()
    if raw.startswith("git@github.com:"):
        slug = raw.removeprefix("git@github.com:").removesuffix(".git")
        url = f"https://github.com/{slug}"
    else:
        match = GITHUB_RE.match(raw)
        if not match:
            raise ValueError("请输入有效的 GitHub 仓库地址，例如 https://github.com/owner/repo")
        url = match.group(1)
    parsed = urlparse(url)
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) != 2:
        raise ValueError("GitHub 地址需要包含 owner/repo")
    owner, repo = parts
    repo_name = f"{owner}/{repo}"
    repo_key = hashlib.sha256(url.lower().encode("utf-8")).hexdigest()[:16]
    return url, repo_key, repo_name


def repo_path(repo_key: str) -> Path:
    return get_settings().repo_dir / repo_key


def is_text_repo_path(path: str) -> bool:
    posix = PurePosixPath(path)
    return posix.suffix.lower() in TEXT_EXTS or posix.name in TEXT_NAMES


def sanitize_component(component: str) -> str:
    cleaned = WINDOWS_INVALID_CHARS.sub("_", component).rstrip(" .")
    if not cleaned:
        cleaned = "_"
    stem = cleaned.split(".")[0].upper()
    if stem in WINDOWS_RESERVED_NAMES:
        cleaned = f"_{cleaned}"
    return cleaned


def sanitize_repo_path(path: str) -> Path:
    return Path(*[sanitize_component(part) for part in PurePosixPath(path).parts])


def remove_tree(path: Path) -> None:
    def onerror(function, value, _exc_info):
        os.chmod(value, stat.S_IWRITE)
        function(value)

    if path.exists():
        shutil.rmtree(path, onerror=onerror)


def run_git(args: list[str], cwd: Path | None = None, timeout: int = 180) -> subprocess.CompletedProcess:
    return subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )


def run_git_bytes(args: list[str], cwd: Path | None = None, timeout: int = 180) -> bytes:
    return subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        check=True,
        capture_output=True,
        timeout=timeout,
    ).stdout


def should_fallback_to_virtual_checkout(detail: str) -> bool:
    lowered = detail.lower()
    return "invalid path" in lowered or "unable to checkout working tree" in lowered


def virtual_checkout(repo_url: str, target: Path) -> None:
    settings = get_settings()
    bare_dir = target.with_name(f"{target.name}.bare.git")
    if bare_dir.exists():
        remove_tree(bare_dir)
    if target.exists():
        remove_tree(target)
    target.mkdir(parents=True, exist_ok=True)

    try:
        run_git(["git", "clone", "--bare", "--depth", "1", repo_url, str(bare_dir)], timeout=240)
        tree = run_git_bytes(["git", "--git-dir", str(bare_dir), "ls-tree", "-r", "-l", "-z", "HEAD"], timeout=120)
        path_map: dict[str, str] = {}
        exported = 0
        for raw_entry in tree.split(b"\x00"):
            if not raw_entry:
                continue
            meta_raw, _, path_raw = raw_entry.partition(b"\t")
            meta = meta_raw.decode("utf-8", errors="replace").split()
            if len(meta) < 4 or meta[1] != "blob":
                continue
            object_hash = meta[2]
            size_text = meta[3]
            if not size_text.isdigit() or int(size_text) > settings.max_file_bytes:
                continue
            original_path = path_raw.decode("utf-8", errors="replace")
            if not is_text_repo_path(original_path):
                continue
            safe_rel = sanitize_repo_path(original_path)
            destination = target / safe_rel
            destination.parent.mkdir(parents=True, exist_ok=True)
            content = run_git_bytes(["git", "--git-dir", str(bare_dir), "cat-file", "-p", object_hash], timeout=60)
            destination.write_bytes(content)
            safe_path = safe_rel.as_posix()
            path_map[safe_path] = original_path
            exported += 1
            if exported >= settings.max_files:
                break
        (target / VIRTUAL_MARKER).write_text(
            "This directory was generated by project-helper because Git checkout failed on this OS.\n",
            encoding="utf-8",
        )
        (target / ".project-helper-path-map.json").write_text(
            json.dumps(path_map, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    finally:
        if bare_dir.exists():
            remove_tree(bare_dir)


def clone_repo(repo_url: str, target: Path) -> None:
    if target.exists() and ((target / ".git").exists() or (target / VIRTUAL_MARKER).exists()):
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        repo_root = get_settings().repo_dir.resolve()
        resolved = target.resolve()
        if not str(resolved).startswith(str(repo_root)):
            raise RuntimeError(f"目标目录已存在但不是 Git 仓库: {target}")
        remove_tree(resolved)
    try:
        run_git(["git", "clone", "--depth", "1", repo_url, str(target)])
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or str(exc)).strip()
        if should_fallback_to_virtual_checkout(detail):
            virtual_checkout(repo_url, target)
            return
        raise RuntimeError(f"Git 克隆失败：{detail[:1000]}") from exc

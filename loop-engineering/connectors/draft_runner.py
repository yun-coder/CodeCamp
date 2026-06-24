#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
draft_runner.py — 在 worktree 里调 Agnes 起草代码

对应橙皮书 §03 动作三·起草
"""
from __future__ import annotations
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from agnes_client import chat, get_text, is_configured

# 强制重读 .env(覆盖可能过期的 import)
import os
from pathlib import Path as _P
_env_file = _P(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _k, _, _v = _line.partition("=")
        _k = _k.strip()
        _v = _v.strip().strip('"').strip("'")
        if _k and _k not in os.environ:
            os.environ[_k] = _v

ALLOWED_DIRS = ("src", "tests", "docs", "kb", "inbox")
FORBIDDEN_IN_CONTENT = [
    (r"\bTODO\b", "TODO"),
    (r"\bFIXME\b", "FIXME"),
    (r"\bprint\s*\(", "print()"),
    (r"\bconsole\.log\s*\(", "console.log"),
]
SECRET_PATTERNS = [
    r"sk-[a-zA-Z0-9]{20,}",
    r"sk-lf-[a-zA-Z0-9-]{20,}",
    r"AKIA[0-9A-Z]{16}",
    r"AIza[0-9A-Za-z_-]{35}",
]


SYSTEM_PROMPT = """你是 Agnes,一个为 loop-engineering 起草代码的助手。

【你的工作】
读取一个 inbox 任务文件,产出 1 个 git commit 所需的全部材料。

【硬约束(违反 = 任务失败)】
1. 路径必须在白名单:src/ tests/ docs/ kb/ inbox/
2. 内容禁止含:TODO / FIXME / print() / console.log()
3. 内容禁止含任何 API key 模式
4. commit message 必须含:因为 / so that / in order to / fixes / refs / closes 之一
5. commit message 长度 >= 20 字符

【输出格式】严格 JSON:
{
  "action": "create_file",
  "path": "src/<分类>/<文件名>.md",
  "content": "<完整内容>",
  "commit_message": "<type>: <一句话>\\n\\nbecause: <为什么>\\nso that: <目的>\\n\\nrefs: <来源>"
}

任务不明确返回:{"action": "no_action", "reason": "<原因>"}
"""


def build_user_prompt(inbox_text, wt_status):
    return f"""【inbox 任务】
{inbox_text}

【当前 worktree git status】
{wt_status if wt_status.strip() else "(空,新 worktree)"}

只输出 JSON。"""


def validate_response(resp, wt_root):
    try:
        text = get_text(resp).strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        data = json.loads(text)
    except Exception as e:
        return False, f"JSON 解析失败: {e}", None

    if data.get("action") == "no_action":
        return True, f"Agnes 选择不做事: {data.get('reason', '?')}", None

    if data.get("action") != "create_file":
        return False, f"action 必须是 create_file 或 no_action,得到 {data.get('action')}", None

    path_str = data.get("path", "")
    if not path_str:
        return False, "path 为空", None
    if path_str.split("/")[0] not in ALLOWED_DIRS:
        return False, f"path 越界: {path_str}", None

    content = data.get("content", "")
    if not content.strip():
        return False, "content 为空", None

    for pat, name in FORBIDDEN_IN_CONTENT:
        if re.search(pat, content):
            return False, f"content 含禁止模式: {name}", None
    for pat in SECRET_PATTERNS:
        if re.search(pat, content):
            return False, f"content 含 secret 模式", None

    msg = data.get("commit_message", "").strip()
    if len(msg) < 20:
        return False, f"commit message 太短: {len(msg)} 字符", None
    why_signals = ["因为", "so that", "in order to", "fixes", "refs", "closes"]
    if not any(s.lower() in msg.lower() for s in why_signals):
        return False, "commit message 缺'为什么'信号词", None

    return True, "ok", data


def apply_response(wt_root, data):
    target = wt_root / data["path"]
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(data["content"], encoding="utf-8")
    return target


def git_commit(wt_root, message):
    add = subprocess.run(
        ["git", "add", "-A"], cwd=wt_root, capture_output=True, text=True
    )
    if add.returncode != 0:
        return False, f"git add 失败: {add.stderr.strip()[:200]}"
    commit = subprocess.run(
        ["git", "commit", "-m", message, "--no-verify"],
        cwd=wt_root, capture_output=True, text=True,
    )
    if commit.returncode != 0:
        return False, f"git commit 失败: {commit.stderr.strip()[:200]}"
    return True, commit.stdout.strip().split("\n")[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inbox", type=Path)
    ap.add_argument("worktree", type=Path)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    inbox_path = repo_root / args.inbox if not args.inbox.is_absolute() else args.inbox
    wt_path = args.worktree if args.worktree.is_absolute() else repo_root / args.worktree

    if not inbox_path.exists():
        print(f"ERROR: inbox 不存在 {inbox_path}", file=sys.stderr); return 2
    if not wt_path.exists():
        print(f"ERROR: worktree 不存在 {wt_path}", file=sys.stderr); return 2

    inbox_text = inbox_path.read_text(encoding="utf-8")
    status = subprocess.run(
        ["git", "status", "--short"], cwd=wt_path, capture_output=True, text=True
    ).stdout

    print(f"=== draft_runner ===")
    print(f"  inbox:    {inbox_path.name}")
    print(f"  worktree: {wt_path}")
    print(f"  agnes:    {'configured (real)' if is_configured() else 'mock mode'}")

    resp = chat([
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_prompt(inbox_text, status)},
    ], max_tokens=4000, temperature=0.3)

    ok, reason, data = validate_response(resp, wt_path)
    if not ok:
        print(f"  FAIL Agnes 输出不合规: {reason}", file=sys.stderr)
        print(f"  原始: {get_text(resp)[:300]}", file=sys.stderr)
        return 3
    if data is None:
        print(f"  {reason}")
        return 0

    print(f"  ok 校验通过")
    print(f"  path: {data['path']}")
    print(f"  msg:  {data['commit_message'].splitlines()[0][:60]}")

    if args.dry_run:
        print("\n[dry-run] 内容预览:")
        print("---")
        print(data["content"][:400] + ("..." if len(data["content"]) > 400 else ""))
        print("---")
        return 0

    written = apply_response(wt_path, data)
    print(f"  wrote {written.relative_to(wt_path)}")

    ok, msg = git_commit(wt_path, data["commit_message"])
    if not ok:
        print(f"  FAIL {msg}", file=sys.stderr)
        return 4
    print(f"  ok {msg}")
    print(f"\n下一步:bash run.sh evaluate")
    return 0


if __name__ == "__main__":
    sys.exit(main())

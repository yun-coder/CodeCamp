#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
evaluator/gate.py — 独立评判器(§05 关键零件)

设计原则(对应橙皮书 §05 + §06 Stripe Minions):
1. 确定性逻辑,不调 LLM,LLM 跳不过
2. 默认拒绝(deny-by-default,对应 §05 "assume the code is broken until proven otherwise")
3. 评判者是独立的,不读 SKILL.md 的修改理由
4. 必须有 hard 失败信号(exit code 0=PASS, 1=FAIL, 2=DEFER)

被评判的事(worktree 里的修改)要满足所有 gate 才算 PASS:
  G1 worktree 相对 main 有 diff(不是空修改)
  G2 修改落在白名单路径(src/, tests/, docs/)
  G3 危险标记(self-evident 失败):TODO/FIXME/print()/console.log/bare except
  G4 token 上限:本轮估算 token < MAX_TOKENS
  G5 commit message 包含"为什么"(不只是"改了什么")

如果任何 G 失败,FAIL。如果是边界情况,DEFER。
"""
from __future__ import annotations
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------- 配置 ----------
REPO_ROOT = Path(__file__).resolve().parent.parent
# 关键:evaluator 自己 chdir 到 repo 根,subprocess git 命令才不会跑错目录
os.chdir(REPO_ROOT)
STATE_DIR = REPO_ROOT / "state"
MEMORY = STATE_DIR / "memory.md"
WORKTREES_ROOT = REPO_ROOT / ".worktrees"
MAX_TOKENS = 50000  # §07 token 失控防御
ALLOWED_DIRS = {"src", "tests", "docs"}
FORBIDDEN_PATTERNS = [
    (r"\bTODO\b", "TODO 残留"),
    (r"\bFIXME\b", "FIXME 残留"),
    (r"\bprint\s*\(", "print() 调用"),
    (r"\bconsole\.log\s*\(", "console.log 调用"),
    (r"except\s*:\s*$", "bare except"),
    (r"pass\s*#\s*later", "later pass"),
]

# ---------- Gate 主体 ----------

def gate_diff_nonempty(wt_path: Path) -> tuple[bool, str]:
    """G1: worktree 相对 main 必须有真实 diff(不是空修改)"""
    try:
        # 跟 main 比,不是跟 wt 自己的 HEAD — wt 里 commit 后 diff=0
        r = subprocess.run(
            ["git", "diff", "--stat", "main...HEAD"],
            cwd=wt_path, capture_output=True, text=True, timeout=10
        )
    except subprocess.TimeoutExpired:
        return False, "G1 git diff 超时"
    if r.returncode != 0:
        return False, f"G1 git diff 失败: {r.stderr.strip()[:200]}"
    if not r.stdout.strip():
        return False, "G1 相对 main 无 diff(空修改,不算做事)"
    return True, f"G1 相对 main diff 行数: {len(r.stdout.splitlines())}"


def gate_path_in_whitelist(wt_path: Path) -> tuple[bool, str]:
    """G2: 修改只能落在 src/ tests/ docs/(相对 main 的差异)"""
    r = subprocess.run(
        ["git", "diff", "--name-only", "main...HEAD"],
        cwd=wt_path, capture_output=True, text=True, timeout=10
    )
    if r.returncode != 0:
        return False, f"G2 git diff name-only 失败: {r.stderr.strip()[:200]}"
    changed = [ln.strip() for ln in r.stdout.splitlines() if ln.strip()]
    if not changed:
        return False, "G2 无改动文件"
    bad = [f for f in changed if f.split("/")[0] not in ALLOWED_DIRS]
    if bad:
        return False, f"G2 越界修改: {bad[:3]}"
    return True, f"G2 修改 {len(changed)} 个文件,均在白名单"


def gate_no_forbidden(wt_path: Path) -> tuple[bool, str]:
    """G3: 不能有 TODO/FIXME/print/console.log/bare except(相对 main)"""
    r = subprocess.run(
        ["git", "diff", "main...HEAD"],
        cwd=wt_path, capture_output=True, text=True, timeout=15
    )
    if r.returncode != 0:
        return False, f"G3 git diff 失败: {r.stderr.strip()[:200]}"
    diff = r.stdout
    hits = []
    for pat, name in FORBIDDEN_PATTERNS:
        for m in re.finditer(pat, diff):
            line = diff[:m.start()].count("\n")
            diff_line = diff.split("\n")[line] if line < len(diff.split("\n")) else ""
            if diff_line.startswith("+") and not diff_line.startswith("+++"):
                hits.append(f"{name} @ {diff_line.strip()[:60]}")
    if hits:
        return False, f"G3 自爆标记: {hits[:3]}"
    return True, "G3 无禁止标记"


def gate_commit_message(wt_path: Path) -> tuple[bool, str]:
    """G5: commit message 必须解释为什么,不只说改了什么"""
    r = subprocess.run(
        ["git", "log", "-1", "--pretty=%B", "HEAD"],
        cwd=wt_path, capture_output=True, text=True, timeout=10
    )
    if r.returncode != 0:
        return False, f"G5 git log 失败: {r.stderr.strip()[:200]}"
    msg = r.stdout.strip()
    if len(msg) < 20:
        return False, f"G5 commit message 太短: {len(msg)} 字符(<20)"
    why_signals = ["因为", "so that", "in order to", "fixes", "refs", "closes", "reason", "why"]
    if not any(s.lower() in msg.lower() for s in why_signals):
        return False, f"G5 commit message 缺'为什么'信号词: {msg[:80]}"
    return True, f"G5 commit 长度 {len(msg)}, 含解释"


def gate_token_budget(wt_path: Path) -> tuple[bool, str]:
    """G4: token 上限防御(§07 token 失控)
    估算方式:相对 main 的 diff 字符数 / 3 ≈ token 数"""
    r = subprocess.run(
        ["git", "diff", "main...HEAD"],
        cwd=wt_path, capture_output=True, text=True, timeout=15
    )
    if r.returncode != 0:
        return False, "G4 读 diff 失败"
    est_tokens = len(r.stdout) // 3
    if est_tokens > MAX_TOKENS:
        return False, f"G4 估算 token {est_tokens} 超过上限 {MAX_TOKENS}"
    return True, f"G4 估算 token {est_tokens} / {MAX_TOKENS}"


def append_memory(slug: str, status: str, summary: str) -> None:
    """§04 零件六 · 持久化"""
    MEMORY.parent.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{now} | {slug} | {status} | {summary}\n"
    with open(MEMORY, "a", encoding="utf-8") as f:
        f.write(line)


def find_active_worktree() -> Path | None:
    """找出最近修改且未合并的 worktree"""
    if not WORKTREES_ROOT.exists():
        return None
    candidates = []
    for p in WORKTREES_ROOT.iterdir():
        if not p.is_dir():
            continue
        git = p / ".git"
        if not (git.exists() or git.is_file()):
            continue
        candidates.append((p.stat().st_mtime, p))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    return candidates[0][1]


def main() -> int:
    wt = find_active_worktree()
    if wt is None:
        print("DEFER: 没有 worktree 可评判", file=sys.stderr)
        return 2

    slug = wt.name
    print(f"=== Evaluating {slug} ===")
    gates = [
        gate_diff_nonempty,
        gate_path_in_whitelist,
        gate_no_forbidden,
        gate_commit_message,
        gate_token_budget,
    ]
    results = []
    for g in gates:
        ok, msg = g(wt)
        marker = "PASS" if ok else "FAIL"
        print(f"  [{marker}] {msg}")
        results.append((ok, msg))

    failed = [m for ok, m in results if not ok]
    if failed:
        summary = f"REJECTED by {len(failed)} gate(s): {failed[0][:120]}"
        append_memory(slug, "failed", summary)
        print(f"\n=== RESULT: FAIL ===\n{summary}")
        return 1

    summary = "all gates passed"
    append_memory(slug, "passed", summary)
    print(f"\n=== RESULT: PASS ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())

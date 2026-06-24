#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gate.py — 独立评判器(§05 关键零件)

从 v1 继承并扩展:
- G1: worktree 相对 main 有 diff
- G2: 修改落在白名单路径
- G3: 无 TODO/FIXME/print/console.log/bare except
- G4: token 上限(估算)
- G5: commit message 含「为什么」

从 5 gate 扩展到 8 gate:
- G6: 跑测试(pytest 或 npm test,白名单项目触发)
- G7: worktree 内有 .gitignore 之外的 secrets(API key / .env)
- G8: 引用了 KB 或 Google 书签(溯源,软要求)

退出码:0=PASS, 1=FAIL, 2=DEFER
"""
from __future__ import annotations
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
os.chdir(REPO_ROOT)
STATE_DIR = REPO_ROOT / "state"
MEMORY = STATE_DIR / "memory.md"
WORKTREES_ROOT = REPO_ROOT / ".worktrees"
MAX_TOKENS = 50000
ALLOWED_DIRS = {"src", "tests", "docs", "kb", "inbox"}


def detect_main_branch() -> str:
    """自动检测主分支名:优先 main,其次 master,最后 HEAD"""
    for cand in ("main", "master"):
        r = subprocess.run(
            ["git", "rev-parse", "--verify", cand],
            cwd=REPO_ROOT, capture_output=True, text=True,
        )
        if r.returncode == 0:
            return cand
    return "HEAD"
FORBIDDEN_PATTERNS = [
    (r"\bTODO\b", "TODO 残留"),
    (r"\bFIXME\b", "FIXME 残留"),
    (r"\bprint\s*\(", "print() 调用"),
    (r"\bconsole\.log\s*\(", "console.log 调用"),
    (r"except\s*:\s*$", "bare except"),
    (r"pass\s*#\s*later", "later pass"),
]
SECRET_PATTERNS = [
    (r"sk-[a-zA-Z0-9]{20,}", "OpenAI/Anthropic key"),
    (r"pk-lf-[a-zA-Z0-9-]{20,}", "Langfuse public key"),
    (r"sk-lf-[a-zA-Z0-9-]{20,}", "Langfuse secret key"),
    (r"AKIA[0-9A-Z]{16}", "AWS access key"),
    (r"AIza[0-9A-Za-z_-]{35}", "Google API key"),
]
TESTABLE_TOP_LEVEL = {"agent_platform", "loop-engineering"}


MAIN_BRANCH = detect_main_branch()


def _git_diff(wt: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "diff", f"{MAIN_BRANCH}...HEAD", *args],
        cwd=wt, capture_output=True, text=True, timeout=15,
    )


def gate_diff_nonempty(wt: Path) -> tuple[bool, str]:
    r = _git_diff(wt, "--stat")
    if r.returncode != 0:
        return False, f"G1 git diff 失败: {r.stderr.strip()[:200]}"
    if not r.stdout.strip():
        return False, "G1 相对 main 无 diff(空修改)"
    return True, f"G1 相对 main diff 行数: {len(r.stdout.splitlines())}"


def gate_path_in_whitelist(wt: Path) -> tuple[bool, str]:
    r = _git_diff(wt, "--name-only")
    if r.returncode != 0:
        return False, f"G2 git diff name-only 失败"
    changed = [ln.strip() for ln in r.stdout.splitlines() if ln.strip()]
    if not changed:
        return False, "G2 无改动文件"
    bad = [f for f in changed if f.split("/")[0] not in ALLOWED_DIRS]
    if bad:
        return False, f"G2 越界修改: {bad[:3]}"
    return True, f"G2 修改 {len(changed)} 个文件,均在白名单"


def gate_no_forbidden(wt: Path) -> tuple[bool, str]:
    r = _git_diff(wt)
    if r.returncode != 0:
        return False, f"G3 git diff 失败"
    diff = r.stdout
    hits = []
    for pat, name in FORBIDDEN_PATTERNS:
        for m in re.finditer(pat, diff):
            line = diff[:m.start()].count("\n")
            lines = diff.split("\n")
            diff_line = lines[line] if line < len(lines) else ""
            if diff_line.startswith("+") and not diff_line.startswith("+++"):
                hits.append(f"{name} @ {diff_line.strip()[:60]}")
    if hits:
        return False, f"G3 自爆标记: {hits[:3]}"
    return True, "G3 无禁止标记"


def gate_commit_message(wt: Path) -> tuple[bool, str]:
    r = subprocess.run(
        ["git", "log", "-1", "--pretty=%B", "HEAD"],
        cwd=wt, capture_output=True, text=True, timeout=10,
    )
    if r.returncode != 0:
        return False, f"G5 git log 失败"
    msg = r.stdout.strip()
    if len(msg) < 20:
        return False, f"G5 commit message 太短: {len(msg)} 字符(<20)"
    why_signals = ["因为", "so that", "in order to", "fixes", "refs",
                   "closes", "reason", "why", "refs #", "closes #"]
    if not any(s.lower() in msg.lower() for s in why_signals):
        return False, f"G5 commit message 缺'为什么'信号: {msg[:80]}"
    return True, f"G5 commit 长度 {len(msg)}, 含解释"


def gate_token_budget(wt: Path) -> tuple[bool, str]:
    r = _git_diff(wt)
    if r.returncode != 0:
        return False, "G4 读 diff 失败"
    est_tokens = len(r.stdout) // 3
    if est_tokens > MAX_TOKENS:
        return False, f"G4 估算 token {est_tokens} 超过上限 {MAX_TOKENS}"
    return True, f"G4 估算 token {est_tokens} / {MAX_TOKENS}"


def gate_run_tests(wt: Path) -> tuple[bool, str]:
    """G6:如果改动涉及白名单项目,跑一次测试
    白名单:agent_platform/ loop-engineering/
    """
    r = _git_diff(wt, "--name-only")
    changed = r.stdout.strip().splitlines()
    triggered = set()
    for f in changed:
        for proj in TESTABLE_TOP_LEVEL:
            if f.startswith(proj + "/"):
                triggered.add(proj)

    if not triggered:
        return True, "G6 改动不涉及测试项目,跳过"

    # 找最近的 pyproject.toml / package.json
    for proj in triggered:
        proj_dir = wt / proj
        if not proj_dir.exists():
            continue
        # Python 项目
        if (proj_dir / "pyproject.toml").exists() or (proj_dir / "tests").exists():
            py = subprocess.run(
                [sys.executable, "-m", "pytest", "tests/", "-x", "-q", "--tb=line"],
                cwd=proj_dir, capture_output=True, text=True, timeout=180,
            )
            if py.returncode != 0:
                tail = (py.stdout + py.stderr).strip().splitlines()[-3:]
                return False, f"G6 pytest 失败 in {proj}: {' | '.join(tail)[:200]}"
            return True, f"G6 pytest 通过 in {proj}"
        # Node 项目
        if (proj_dir / "package.json").exists():
            nd = subprocess.run(
                ["npm", "test", "--", "--silent", "--passWithNoTests"],
                cwd=proj_dir, capture_output=True, text=True, timeout=180,
                shell=True,
            )
            if nd.returncode != 0:
                return False, f"G6 npm test 失败 in {proj}: {nd.stderr.strip()[-200:]}"
            return True, f"G6 npm test 通过 in {proj}"

    return True, "G6 无可执行测试"


def gate_no_secrets(wt: Path) -> tuple[bool, str]:
    """G7:新增文件不能含常见 API key 模式"""
    r = _git_diff(wt)
    diff = r.stdout
    hits = []
    for pat, name in SECRET_PATTERNS:
        for m in re.finditer(pat, diff):
            line = diff[:m.start()].count("\n")
            lines = diff.split("\n")
            dl = lines[line] if line < len(lines) else ""
            if dl.startswith("+") and not dl.startswith("+++"):
                hits.append(f"{name} @ {dl.strip()[:60]}")
    if hits:
        return False, f"G7 检测到 secrets: {hits[:2]} — 立刻 revert!"
    return True, "G7 无明文 secrets"


def gate_has_source(wt: Path) -> tuple[bool, str]:
    """G8(软要求):commit 或 diff 提到 KB 文件或 Google 书签
    这是软要求——只是提示,不阻断(返回 True 但带信息)
    """
    # commit message 含源
    r = subprocess.run(
        ["git", "log", "-1", "--pretty=%B", "HEAD"],
        cwd=wt, capture_output=True, text=True, timeout=10,
    )
    msg = r.stdout.strip().lower()
    diff = _git_diff(wt).stdout.lower()
    sources = []
    if "kb://" in msg or "knowledge" in msg or "知识库" in msg:
        sources.append("KB")
    if "bookmark" in msg or "书签" in msg:
        sources.append("bookmark")
    if "refs:" in msg or "ref:" in msg:
        sources.append("explicit-ref")
    if sources:
        return True, f"G8 引用来源: {', '.join(sources)}"
    return True, "G8 未显式溯源(软要求,放过)"


def append_memory(slug: str, status: str, summary: str) -> None:
    MEMORY.parent.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{now} | {slug} | {status} | {summary}\n"
    with open(MEMORY, "a", encoding="utf-8") as f:
        f.write(line)


def find_active_worktree() -> Path | None:
    if not WORKTREES_ROOT.exists():
        return None
    candidates = []
    for p in WORKTREES_ROOT.iterdir():
        if not p.is_dir():
            continue
        if not (p / ".git").exists():
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
        ("G1 diff",     gate_diff_nonempty),
        ("G2 path",     gate_path_in_whitelist),
        ("G3 forbid",   gate_no_forbidden),
        ("G4 token",    gate_token_budget),
        ("G5 why",      gate_commit_message),
        ("G6 test",     gate_run_tests),
        ("G7 secret",   gate_no_secrets),
        ("G8 source",   gate_has_source),
    ]

    results = []
    for label, fn in gates:
        try:
            ok, msg = fn(wt)
        except subprocess.TimeoutExpired:
            ok, msg = False, f"{label} 超时"
        except Exception as e:
            ok, msg = False, f"{label} 异常: {e}"
        marker = "PASS" if ok else "FAIL"
        print(f"  [{marker}] {label}: {msg}")
        results.append((ok, msg))

    failed = [m for ok, m in results if not ok]
    if failed:
        summary = f"REJECTED by {len(failed)} gate(s): {failed[0][:120]}"
        append_memory(slug, "failed", summary)
        print(f"\n=== RESULT: FAIL ===\n{summary}")
        return 1

    summary = "all 8 gates passed"
    append_memory(slug, "passed", summary)
    print(f"\n=== RESULT: PASS ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())

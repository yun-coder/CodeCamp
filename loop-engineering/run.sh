#!/usr/bin/env bash
# run.sh — 手动跑一圈 loop-triage(对应 §09 第一步)
/loop 之前的单次练习
#
# 用法:
#   bash run.sh                    # 跑完整一圈(发现 → worktree → 验证 → 持久化)
#   bash run.sh discover           # 只跑"发现"步骤,看看 inbox 里有什么
#   bash run.sh prepare <file>     # 给某个 inbox 文件开 worktree
#   bash run.sh evaluate           # 跑 evaluator/gate.py
#   bash run.sh status             # 看 state/memory.md + 现有 worktrees
#
# 这个脚本**不**包含 LLM 调用——发现 + 起草代码是 Claude Code 的事
# (在 Claude Code 里通过 $loop-triage skill 触发),这个脚本只是把
# 脚手架流程跑通,让你在没装 Claude Code 的机器上也能验证闭环。
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(pwd)"

cmd="${1:-all}"

discover() {
  echo "=== DISCOVERY (动作一) ==="
  echo "inbox/ 下的待办:"
  if ls inbox/*.md 2>/dev/null; then
    echo
    for f in inbox/*.md; do
      [[ -f "$f" ]] || continue
      age_hours=$(( ( $(date +%s) - $(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f") ) / 3600 ))
      marker="[ok]"
      (( age_hours > 24 )) && marker="[stale]"
      grep -q "high" "$f" 2>/dev/null && marker="[HIGH]"
      echo "  $marker $f (${age_hours}h)"
    done
  else
    echo "  (空)"
  fi
  echo
  echo "state/memory.md 最近 5 条:"
  if [[ -f state/memory.md ]]; then
    grep -v "^<!--" state/memory.md | grep -v "^$" | tail -5 || echo "  (空)"
  else
    echo "  (不存在)"
  fi
}

prepare() {
  local file="${1:?用法: bash run.sh prepare <inbox 文件>}"
  local slug
  slug="$(basename "$file" .md)"
  local stamp
  stamp="$(date -u +%Y%m%d-%H%M)"
  local wt_name="wt-${stamp}-${slug}"
  echo "=== HANDOFF (动作二) ==="
  echo "  file: $file"
  echo "  worktree: .worktrees/$wt_name"

  if [[ ! -d .worktrees ]]; then
    mkdir -p .worktrees
  fi

  # 必须先 commit 当前状态,worktree 才能从 HEAD 开新分支
  if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    echo "  [note] 工作区有未提交改动,先 stash"
    git stash push -u -m "loop-triage auto-stash @ $stamp" || true
  fi

  git worktree add ".worktrees/$wt_name" -b "loop/${wt_name}" HEAD
  echo "  ✓ worktree 已创建"
  echo
  echo "接下来:"
  echo "  1. cd .worktrees/$wt_name"
  echo "  2. 在 Claude Code 里跑: \$loop-triage 处理 $file"
  echo "  3. 改完 commit,然后回到这里跑: bash run.sh evaluate"
}

evaluate() {
  echo "=== EVALUATION (动作三,§05 关键) ==="
  if [[ ! -f evaluator/gate.py ]]; then
    echo "ERROR: evaluator/gate.py 不存在"; exit 2
  fi
  python evaluator/gate.py
}

status() {
  echo "=== STATUS ==="
  echo
  echo "[worktrees]"
  git worktree list 2>/dev/null || echo "  (无)"
  echo
  echo "[memory.md]"
  if [[ -f state/memory.md ]]; then
    cat state/memory.md
  else
    echo "  (不存在)"
  fi
}

case "$cmd" in
  discover) discover ;;
  prepare)  prepare "${@:2}" ;;
  evaluate) evaluate ;;
  status)   status ;;
  all)
    discover
    echo
    evaluate
    ;;
  *)
    echo "用法: bash run.sh [discover|prepare <file>|evaluate|status|all]"
    exit 1
    ;;
esac

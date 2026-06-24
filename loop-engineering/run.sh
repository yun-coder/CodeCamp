#!/usr/bin/env bash
# run.sh — loop-engineering 入口
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"

cmd="${1:-all}"

discover() {
    echo "=== DISCOVERY (动作一) ==="
    echo "inbox/ 待办:"
    if ls inbox/*.md 2>/dev/null; then
        for f in inbox/*.md; do
            [[ -f "$f" ]] || continue
            age_hours=$(( ( $(date +%s) - $(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f") ) / 3600 ))
            marker="[ok]"
            (( age_hours > 24 )) && marker="[stale]"
            grep -q "high" "$f" 2>/dev/null && marker="[HIGH]"
            echo "  $marker $f (${age_hours}h)"
        done
    else
        echo "  (空) — 跑:python connectors/kb_bridge.py 自动补充"
    fi
    echo
    echo "state/memory.md 最近 5 条:"
    if [[ -f state/memory.md ]]; then
        grep -v "^<!--" state/memory.md | grep -v "^$" | tail -5 || echo "  (空)"
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

    if [[ ! -d .worktrees ]]; then mkdir -p .worktrees; fi
    if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
        git stash push -u -m "loop-triage auto-stash @ $stamp" || true
    fi
    git worktree add ".worktrees/$wt_name" -b "loop/${wt_name}" HEAD
    echo "  ✓ worktree 已创建"
    echo
    echo "接下来:"
    echo "  1. bash run.sh draft \"$file\"  (调 Agnes 起草)"
    echo "  2. bash run.sh evaluate        (跑 8 个 gate)"
    echo "  3. 通过:merge 回 main; 失败:留 worktree 重写"
}

evaluate() {
    echo "=== EVALUATION (动作三 + 四,§05 关键) ==="
    python evaluator/gate.py
}

draft() {
    # 动作三·起草:在最新 worktree 里调 Agnes 改代码
    local inbox_file="${1:?用法: bash run.sh draft <inbox 文件>}"
    local wt="${2:-}"

    if [[ -z "$wt" ]]; then
        wt=$(ls -dt .worktrees/*/ 2>/dev/null | head -1)
        if [[ -z "$wt" ]]; then
            echo "ERROR: 没有 worktree,先跑 prepare" >&2
            exit 2
        fi
        wt="${wt%/}"
    fi

    echo "=== DRAFT (动作三·起草,Agnes) ==="
    echo "  inbox:    $inbox_file"
    echo "  worktree: $wt"
    if [[ -n "${AGNES_API_KEY:-}" ]]; then
        echo "  agnes:    real (env var set)"
    else
        echo "  agnes:    mock (no AGNES_API_KEY)"
    fi

    python connectors/draft_runner.py "$inbox_file" "$wt"
}

status() {
    echo "=== STATUS ==="
    echo
    echo "[worktrees]"
    git worktree list 2>/dev/null || echo "  (无)"
    echo
    echo "[memory.md]"
    if [[ -f state/memory.md ]]; then cat state/memory.md; else echo "  (不存在)"; fi
    echo
    echo "[inbox 大小]"
    ls inbox/*.md 2>/dev/null | wc -l || echo "0"
}

ingest_kb() {
    echo "=== INGEST KB REVIEW TASKS ==="
    python connectors/kb_bridge.py
}

ingest_video_bookmarks() {
    echo "=== INGEST VIDEO BOOKMARKS FROM CHROME ==="
    python connectors/chrome_video_scan.py "$@"
}

case "$cmd" in
    discover)            discover ;;
    prepare)             prepare "${@:2}" ;;
    draft)               draft "${@:2}" ;;
    evaluate)            evaluate ;;
    status)              status ;;
    ingest-kb)           ingest_kb ;;
    ingest-video)        ingest_video_bookmarks "${@:2}" ;;
    all)
        discover
        echo
        evaluate
        ;;
    *)
        cat <<EOF
用法: bash run.sh <command>

  discover            列出 inbox + 最近 memory
  prepare <file>      给某个 inbox 文件开 worktree
  draft <inbox> [wt]  调 Agnes 起草代码 + commit(动作三)
  evaluate            跑 8 个 gate(默认对最近 worktree)
  status              全状态
  ingest-kb                  从 my-wiki 知识库生成复盘任务
  all                 discover + evaluate

环境变量(可选,设了走真实 Agnes):
  AGNES_API_KEY       你的 Agnes Key
  AGNES_BASE_URL      默认 https://api.agnes-ai.com/v1
  AGNES_MODEL         默认 agnes-1
  不设则自动走 mock 模式
EOF
        exit 1
        ;;
esac

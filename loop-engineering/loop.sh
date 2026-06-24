#!/usr/bin/env bash
# loop.sh — 替代 run.sh 的轻量 wrapper
# 解决的问题:run.sh 在 git worktree 操作时被 stash 覆盖回 HEAD 版
# 这个 wrapper 是独立的 shell 函数集合,不受 git worktree 影响

set -euo pipefail
cd "$(dirname "$0")"

# ---- 模式检测 ----
detect_agnes_mode() {
    if [[ -n "${AGNES_API_KEY:-}" ]]; then echo "real env"; return; fi
    if [[ -f ".env" ]]; then
        v=$(awk -F= '/^AGNES_API_KEY/ {gsub(/^[ \t]+|[ \t]+$/, "", $2); gsub(/^["\x27]|["\x27]$/, "", $2); print $2; exit}' .env 2>/dev/null || echo "")
        if [[ -n "$v" ]]; then echo "real .env"; return; fi
    fi
    echo "mock"
}

cmd="${1:-help}"

case "$cmd" in
    draft)
        inbox_file="${2:?用法: bash loop.sh draft <inbox>}"
        wt=$(ls -dt .worktrees/*/ 2>/dev/null | head -1)
        if [[ -z "$wt" ]]; then echo "ERROR: 没有 worktree,先跑 prepare (bash run.sh prepare)"; exit 2; fi
        wt="${wt%/}"
        mode=$(detect_agnes_mode)
        echo "=== DRAFT (动作三·起草,Agnes) ==="
        echo "  inbox:    $inbox_file"
        echo "  worktree: $wt"
        if [[ "$mode" == mock ]]; then
            echo "  agnes:    mock (no AGNES_API_KEY)"
        else
            echo "  agnes:    real ($mode)"
        fi
        python connectors/draft_runner.py "$inbox_file" "$wt"
        ;;
    *)
        cat <<EOF
loop.sh — run.sh 的 draft 子命令 wrapper

用法: bash loop.sh draft <inbox 文件>

这个文件独立于 run.sh,不会被 git worktree 操作影响。
run.sh 仍然管:discover / prepare / evaluate / status / ingest-* / all
EOF
        ;;
esac

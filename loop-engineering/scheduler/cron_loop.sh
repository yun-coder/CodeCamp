#!/usr/bin/env bash
# cron_loop.sh — 每 5 分钟跑一圈(对应橙皮书 §06 第三个 case · Cloud Routines 替代)
#
# 用法:
#   bash scheduler/cron_loop.sh          # 跑一圈
#   bash scheduler/cron_loop.sh --triage # 只发现不执行
#   bash scheduler/cron_loop.sh --once   # 只跑 1 次不循环
#
# Windows 任务计划程序调用:
#   操作:启动程序
#   程序:D:\Git\mingw64\bin\bash.exe
#   参数:D:\学习院\CodeCamp\loop-engineering\scheduler\cron_loop.sh
#   起始于:D:\学习院\CodeCamp\loop-engineering
#   触发器:每 5 分钟一次,无限期持续
#
# Linux/macOS 真 cron:
#   */5 * * * * /usr/bin/bash /path/to/loop-engineering/scheduler/cron_loop.sh >> logs/cron.log 2>&1
#
# 设计原则(对应 §07 四笔债):
# - 默认拒绝:失败立刻退出,不留半成品
# - 单实例:用 flock 避免重叠跑
# - 静音跑:成功时不 spam,只在状态变化时通知

set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

LOCKFILE="$ROOT/.worktrees/.loop.lock"
LOGDIR="$ROOT/logs"
mkdir -p "$LOGDIR"

acquire_lock() {
    if [[ -f "$LOCKFILE" ]]; then
        # 检查 PID 是否还活着
        local old_pid
        old_pid="$(cat "$LOCKFILE" 2>/dev/null || echo 0)"
        if kill -0 "$old_pid" 2>/dev/null; then
            echo "[$(date -Iseconds)] 上一轮还在跑(pid=$old_pid),跳过" >> "$LOGDIR/cron.log"
            exit 0
        fi
    fi
    echo $$ > "$LOCKFILE"
    trap 'rm -f "$LOCKFILE"' EXIT
}

notify() {
    local title="$1"
    local body="$2"
    # Windows 通知(可关掉)
    if command -v powershell.exe >/dev/null 2>&1; then
        powershell.exe -Command "
[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null;
[System.Windows.Forms.MessageBox]::Show('$body', 'loop-engineering: $title', 'OK', 'Information')
" >/dev/null 2>&1 || true
    fi
    echo "[$(date -Iseconds)] NOTIFY $title — $body" >> "$LOGDIR/cron.log"
}

run_one_loop() {
    echo "=== loop tick at $(date -Iseconds) ===" >> "$LOGDIR/cron.log"

    # 动作一·发现(读 inbox + memory)
    inbox_count=$(find inbox -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l)
    echo "  inbox 待办: $inbox_count" >> "$LOGDIR/cron.log"

    if [[ "$inbox_count" -eq 0 ]]; then
        # 没有待办,跑一次 KB 扫描补充
        echo "  inbox 空,跑 kb_bridge 补充" >> "$LOGDIR/cron.log"
        python connectors/kb_bridge.py --kb "D:\学习院\my-wiki\AI知识库" --out inbox/ >> "$LOGDIR/cron.log" 2>&1 || true
        inbox_count=$(find inbox -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l)
    fi

    if [[ "$inbox_count" -eq 0 ]]; then
        echo "  仍无待办,本轮空转" >> "$LOGDIR/cron.log"
        return 0
    fi

    # 动作二·交付(开 worktree)
    # 默认挑最早(最旧)的那个
    target=$(ls -t inbox/*.md 2>/dev/null | tail -1)
    slug=$(basename "$target" .md)
    wt_name="wt-$(date -u +%Y%m%d-%H%M)-${slug}"
    wt_name=$(echo "$wt_name" | tr -d '\n\r' | cut -c1-80)

    if [[ ! -d .worktrees ]]; then mkdir -p .worktrees; fi
    # 先 commit 一下脏状态
    if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
        git stash push -u -m "loop auto-stash $(date -Iseconds)" >> "$LOGDIR/cron.log" 2>&1 || true
    fi
    git worktree add ".worktrees/$wt_name" -b "loop/${wt_name}" HEAD >> "$LOGDIR/cron.log" 2>&1
    echo "  opened worktree: $wt_name" >> "$LOGDIR/cron.log"

    # 动作三·这里交给 Hermes(对话模式)或 Claude Code(headless)
    # 真正干活的步骤是:在 wt 里改文件 + commit
    # 在 cron 这种无人值守场景下,默认跳过"写代码",只做发现 + worktree
    # 写代码交给 Claude Code 的 /loop 模式(cron 这层不直接调 LLM——避免失控)
    echo "  [info] 写代码动作需在 Claude Code 内手动 $loop-triage 完成" >> "$LOGDIR/cron.log"
    echo "         完成后跑: bash run.sh evaluate" >> "$LOGDIR/cron.log"

    # 动作三·变体:如果已经 commit 过,自动跑 evaluator
    cd ".worktrees/$wt_name"
    if [[ -n "$(git log --oneline main..HEAD 2>/dev/null)" ]]; then
        echo "  检测到 commit,跑 evaluator..." >> "$LOGDIR/cron.log"
        if python "$ROOT/evaluator/gate.py" >> "$LOGDIR/cron.log" 2>&1; then
            notify "PASS" "$wt_name 通过全部 gate"
            # 动作四·持久化(merge 回 main)
            cd "$ROOT"
            git merge --no-ff "loop/${wt_name}" -m "merge: $wt_name (auto-merged by cron)" >> "$LOGDIR/cron.log" 2>&1 || true
        else
            notify "FAIL" "$wt_name 被 gate 拦下,见 logs/cron.log"
        fi
    fi
}

main() {
    mkdir -p "$LOGDIR"
    acquire_lock
    run_one_loop
    echo "=== loop end ===" >> "$LOGDIR/cron.log"
}

# 处理参数
case "${1:-run}" in
    --triage)
        # 只跑发现
        python connectors/kb_bridge.py --kb "D:\学习院\my-wiki\AI知识库" --out inbox/
        ;;
    --once)
        # 单次,不写 cron.log
        main
        ;;
    *)
        main
        ;;
esac

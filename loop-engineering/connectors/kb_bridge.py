#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kb_bridge.py — 本地知识库桥接器(§04 零件四)

做什么:扫描 D:\学习院\my-wiki\AI知识库\*.md
生成「可以问的问题」清单到 inbox/*.md,这样 loop 发现阶段
能自动从已有知识里挖出"待巩固/待补/已过期"的题目。

不做什么(克制!):
- 不调 LLM,不联网,只做关键词匹配 + 标题聚类
- 不修改原文件,只产生 inbox 草稿
"""
from __future__ import annotations
import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_KB = Path(r"D:\学习院\my-wiki\AI知识库")
DEFAULT_INBOX = Path("inbox")


def scan_kb(kb_dir: Path) -> list[dict]:
    """递归扫描整个 KB,只挑 *.md 指南文件,排除 README/补充集成等冗余文件"""
    files = []
    # 递归扫描所有子目录
    for p in sorted(kb_dir.rglob("*.md")):
        # 排除 README 和补充集成节
        if p.name.lower() in ('readme.md',) or '补充集成' in p.name:
            continue
        # 排除 _ 开头的隐藏/临时文件
        if p.name.startswith('_'):
            continue
        text = p.read_text(encoding="utf-8", errors="replace")
        # 提取一级标题
        h1 = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
        title = h1.group(1).strip() if h1 else p.stem
        files.append({
            "path": p,
            "title": title,
            "rel_path": p.relative_to(kb_dir),
            "size_kb": len(text) / 1024,
            "mtime": datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc),
            "n_links": len(re.findall(r"\[[^\]]+\]\([^\)]+\)", text)),
            "n_providers": len(set(re.findall(r"`([a-z_]+)`", text))),
        })
    return files


def generate_review_tasks(files: list[dict]) -> list[str]:
    """为每个 KB 文件生成一条 inbox 任务:「复盘这份知识」"""
    tasks = []
    now = datetime.now(timezone.utc)
    for f in files:
        age_days = (now - f["mtime"]).days
        # 旧的优先(low 优先级,新近的 med)
        if age_days > 60:
            priority = "high"  # 两个月没看,有腐烂风险
            hint = "已超过 60 天未复习,知识可能腐烂,请核对最新最佳实践"
        elif age_days > 30:
            priority = "med"
            hint = "30 天以上,建议快速扫一遍"
        else:
            priority = "low"
            hint = "较新,可选择性复习"

        task = f"""# 复盘:{f['title']}

[{priority}] {f['path']}

## 任务
- [ ] 阅读一遍,标注过期/仍准的部分
- [ ] 提炼 3 条「我现在还信不信」的判断
- [ ] 如有更新,直接在原文件 patch,commit 时说明理由(对应 G5)
- [ ] 在 memory.md 留一行:`reviewed | {f['title'][:40]} | <1句话结论>`

## 背景
- 分类:{f['rel_path'].parts[0] if len(f['rel_path'].parts) > 1 else '(根)'}
- 文件大小:{f['size_kb']:.1f} KB
- provider 数:{f['n_providers']} 个
- 上次修改:{f['mtime']:%Y-%m-%d}
- 距今:{age_days} 天
- 内链数:{f['n_links']}

## 自动提示
{hint}
"""
        tasks.append(task)
    return tasks


def main() -> int:
    ap = argparse.ArgumentParser(description="扫描本地 KB,生成复盘 inbox 任务")
    ap.add_argument("--kb", type=Path, default=DEFAULT_KB, help="KB 根目录")
    ap.add_argument("--out", type=Path, default=DEFAULT_INBOX, help="inbox 目录")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not args.kb.exists():
        print(f"ERROR: {args.kb} 不存在", file=sys.stderr)
        return 2

    files = scan_kb(args.kb)
    print(f"扫描到 {len(files)} 个 KB 文件:")
    for f in files:
        age = (datetime.now(timezone.utc) - f["mtime"]).days
        cat = f['rel_path'].parts[0] if len(f['rel_path'].parts) > 1 else '(根)'
        print(f"  [{cat:20}] {f['title'][:40]:40} {age:3}d  {f['n_providers']:3}prov  {f['size_kb']:5.1f}KB")

    tasks = generate_review_tasks(files)
    print(f"\n生成 {len(tasks)} 条复盘任务")

    if args.dry_run:
        print("(dry-run,不写入)")
        return 0

    args.out.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    for i, body in enumerate(tasks, 1):
        slug = re.sub(r"[^a-zA-Z0-9\-_\u4e00-\u9fff]+", "-",
                      files[i-1]["title"])[:40].strip("-")
        out = args.out / f"{stamp}-{i:03d}-review-{slug}.md"
        out.write_text(body, encoding="utf-8")
    print(f"✓ 写入 {len(tasks)} 个 inbox 文件")
    return 0


if __name__ == "__main__":
    sys.exit(main())

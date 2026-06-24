#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_inbox_urls.py — 抓取 inbox 任务里的 URL 内容,补充进任务
"""
from __future__ import annotations
import argparse
import re
import sys
from pathlib import Path

import httpx

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def fetch_github_readme(owner: str, repo: str) -> str:
    for b in ["main", "master"]:
        url = f"https://raw.githubusercontent.com/{owner}/{repo}/{b}/README.md"
        try:
            r = httpx.get(url, headers={"User-Agent": UA}, timeout=20, follow_redirects=True)
            if r.status_code == 200 and len(r.text) > 100:
                return f"## README ({b}):\n```\n{r.text[:5000]}\n```"
        except Exception:
            continue
    return "## README 抓取失败"


def fetch_github_meta(owner: str, repo: str) -> str:
    try:
        r = httpx.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers={"User-Agent": UA, "Accept": "application/vnd.github+json"},
            timeout=15,
        )
        if r.status_code == 200:
            data = r.json()
            desc = data.get("description") or "(无)"
            stars = data.get("stargazers_count", 0)
            lang = data.get("language") or "(未知)"
            topics = ", ".join(data.get("topics", [])[:5]) or "(无)"
            return f"- 描述: {desc}\n- Stars: {stars}\n- 语言: {lang}\n- 主题: {topics}"
    except Exception:
        pass
    return "- 元信息抓取失败"


def process_url(url: str) -> str:
    if "github.com" in url:
        m = re.search(r"github\.com/([^/]+)/([^/\?#]+)", url)
        if m:
            owner, repo = m.group(1), m.group(2).rstrip(".git")
            meta = fetch_github_meta(owner, repo)
            readme = fetch_github_readme(owner, repo)
            return f"### {url}\n{meta}\n\n{readme}\n"
    return f"### {url}\n(非 GitHub URL,跳过深度抓取)\n"


def main() -> int:
    ap = argparse.ArgumentParser(description="抓取 inbox 任务里的 URL 内容")
    ap.add_argument("inbox_file", type=Path)
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    if not args.inbox_file.exists():
        print(f"ERROR: {args.inbox_file} 不存在", file=sys.stderr)
        return 2

    content = args.inbox_file.read_text(encoding="utf-8")
    urls = re.findall(r"https?://[^\s\)\]]+", content)

    print(f"找到 {len(urls)} 个 URL\n")
    additions = []
    for url in urls:
        print(f"抓取: {url[:80]}...")
        section = process_url(url)
        additions.append(section)
        print(f"  ✓ {len(section)} 字符\n")

    if args.write:
        addition_text = "\n\n## 自动抓取的 URL 内容\n\n" + "\n".join(additions)
        args.inbox_file.write_text(content + addition_text, encoding="utf-8")
        print(f"\n✓ 已写入 {args.inbox_file}")
    else:
        print("(用 --write 实际写入文件)")

    return 0


if __name__ == "__main__":
    sys.exit(main())

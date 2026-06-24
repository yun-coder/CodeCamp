#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
chrome_video_scan.py — 扫描 Chrome 书签中视频生成相关内容,生成 inbox 任务

用法:
  python connectors/chrome_video_scan.py                    # 扫描 Chrome 默认位置
  python connectors/chrome_video_scan.py --bookmarks PATH  # 自定义书签文件

为什么需要:用户的 Chrome 书签里有大量视频生成相关资源,但每次手动整理太累。
本脚本只做一件事:扫书签 → 按关键词分类 → 生成 inbox/*.md 给 loop 跑。

不做什么(克制!):
- 不调 LLM
- 不联网(读本地 Chrome Bookmarks JSON)
- 不修改书签,只产生 inbox 草稿
"""
from __future__ import annotations
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# 默认 Chrome 书签位置
DEFAULT_CHROME = Path(r'C:\Users\张云亮\AppData\Local\Google\Chrome\User Data\Default\Bookmarks')
DEFAULT_INBOX = Path(r'D:\学习院\CodeCamp\loop-engineering\inbox')

# 视频生成相关关键词(命中即认为相关)
VIDEO_KEYWORDS = [
    # 模型
    'sora', 'kling', '可灵', 'luma', 'dreamina', 'hunyuan', '混元', 'cogvideo',
    'wanvideo', 'wan2', 'wan-2', 'viva', 'vidu', 'pixverse', 'veo',
    'seedance', 'wav2lip', 'lipsync',
    # 类型
    'short-drama', '短剧', 'storyboard', '分镜', '短片', 'story-flicks',
    'text-to-video', '图生视', '文生视', 'video ai', 'ai video', 'ai 视频',
    'video generation', 'ai 短剧', 'ai 动漫', 'ai 漫剧',
    # 工具
    'text_to_vedio', 'video generator', 'video captioner', 'videocaptioner',
    '营销号', '字幕助手', 'chopperbot', 'short-video-factory', 'huashu-skills',
    'huashu skills', '花叔', 'short-video', '短视', 'moviepy', 'ffmpeg',
    'toonflow', 'lumenx', 'aistory', 'ai_story', 'linghuiai', 'shortdramas',
    'typetale', '字字动画', 'arcreel', 'rubbish-video', 'moneyprinterplus',
    'bilibili note', 'bilinote',
]

# 黑名单(防止误命中)
BLACKLIST = [
    'xvideos', 'xhamster', 'pornhub', 'porn', 'jable', 'missav', 'wangfei',
    '网飞tv', 'netflix', 'quasar', 'nf.video', '银河录像局', 'budgetpixel',
    'platform.kimi.com', 'jsoneditor', 'tinypng', 'frankfurter', 'gcoord',
    'outlook', 'mail.qq', 'nvm-sh', 'electron.', 'nestjs', 'lucide', 'iconify',
    'zod.dev', 'vxeui', 'vben', 'leaferjs', 'gltf-viewer', 'win11.blueedge',
    'browserstack', 'caniuse', 'visualgo', 'cs.usfca', 'algorithm-visualizer',
    'bigocheatsheet', 'konvajs', 'maxgraph', 'relation-graph', 'gojs',
    'openseadragon', 'palette', 'x.com', 'reddit.com', 'jiqizhixin', 'qbitai',
    'aibase', 'hex2077', 'huggingface', 'zread', 'moge.ai', 'platform.agnes-ai',
    'api.okinto', 'platform.deepseek', 'platform.minimaxi', 'open.bigmodel',
    'platform.xiaomimimo', 'platform.closeai', 'openrouter', 'siliconflow',
    'build.nvidia', 'docs.aihubmix', 'gpt-plus', 'modelscope', 'bailian',
    'console.volcengine', 'console.bce', 'aistudio', 'happyoyster', 'pexels',
    'go-stock', 'ruvnet', 'bidingcc', 'unclecode', 'microsoft/markitdown',
    'lum1104', 'segment-anything', 'fallenshock', 'hkuds', 'pbakaus',
    'leonxlnx', 'dietrichgebert', 'loop-engineering-orange-book', 'dspy-doc-zh',
    'messenger.abeto', '666ghj', 'mem0ai', 'ai.codefather', 'ragflow',
    '127.0.0.1', 'python-100-days', 'vercel.com', 'langchain.com.cn',
    'mem0.ai', 'docs.activeloop', 'apify.com', 'assemblyai', 'bagel.com',
    'liblib', 'ribbi', 'tapnow', 'namistory', 'arena.ai', 'doubao.com',
    'jimeng.jianying', 'jseea', 'lexue-cloud', 'chat.deepseek', 'yun-coder',
    'zhgcraft', 'alidocs', 'packages.aliyun', 'gzy666', 'limbopro',
    'translate.google', 'jsoneditoronline', 'tool.chinaz',
    'xn--ehqx35aimmzwv', 'github.com/666',
]


def is_relevant(name: str, url: str) -> bool:
    text = (name + ' ' + url).lower()
    for bl in BLACKLIST:
        if bl in text:
            return False
    for kw in VIDEO_KEYWORDS:
        if kw.lower() in text:
            return True
    return False


def categorize(name: str, url: str) -> tuple[str, str]:
    """返回 (cat_id, cat_name)"""
    text = (name + ' ' + url).lower()

    # 具体的视频生成模型(精确匹配)
    if 'sora' in text:
        return 'model-sora', 'Sora (OpenAI)'
    if 'veo' in text and ('google' in text or 'arcreel' in text):
        return 'model-veo', 'Veo (Google)'
    if 'kling' in text or '可灵' in text:
        return 'model-kling', 'Kling 可灵'
    if 'seedance' in text:
        return 'model-seedance', 'Seedance (字节)'
    if 'dreamina' in text:
        return 'model-dreamina', 'Dreamina (字节)'
    if 'hunyuan' in text or '混元' in text:
        return 'model-hunyuan', 'Hunyuan 混元 (腾讯)'
    if 'cogvideo' in text:
        return 'model-cogvideo', 'CogVideo (智谱)'
    if 'vidu' in text:
        return 'model-vidu', 'Vidu (生数)'
    if 'pixverse' in text:
        return 'model-pixverse', 'PixVerse'
    if 'wan' in text and ('video' in text or 'wanvideo' in text or 'wan2' in text or 'wan-2' in text):
        return 'model-wan', 'Wan (阿里)'
    if 'runway' in text:
        return 'model-runway', 'Runway'
    if 'pika' in text:
        return 'model-pika', 'Pika'
    if 'luma' in text:
        return 'model-luma', 'Luma Dream Machine'

    # 短剧分镜工具
    if 'arcreel' in text or 'toonflow' in text or 'lumenx' in text or \
       'typetale' in text or '字字动画' in text or 'linghuiai' in text or \
       'shortdramas' in text or 'ai_story' in text or '分镜' in text or \
       'storyboard' in text or '短剧' in text:
        return 'short-drama-tools', '短剧分镜工具'

    # 一键生成器
    if '营销号' in text or 'moneyprinterplus' in text or 'short-video-factory' in text or \
       'story-flicks' in text or 'text_to_vedio' in text or 'rubbish-video' in text:
        return 'one-click-generators', '一键生成器'

    # 字幕笔记
    if 'caption' in text or '字幕' in text or 'bilinote' in text or \
       '视频笔记' in text or 'chopperbot' in text:
        return 'subtitle-notes', '字幕与笔记'

    # 工具链
    if 'ffmpeg' in text or 'moviepy' in text:
        return 'video-tooling', '视频工具链(FFmpeg等)'

    # 提示词技能
    if 'skills' in text or '花叔' in text or 'huashu' in text or \
       'awesome' in text or 'prompts' in text:
        return 'prompts-skills', '提示词与技能'

    return 'other', '其他视频资源'


def walk(node: dict, path: str = '') -> list[dict]:
    """递归遍历书签树"""
    results = []
    if isinstance(node, dict):
        if node.get('type') == 'url':
            url = node.get('url', '')
            name = node.get('name', '')
            if is_relevant(name, url):
                results.append({'name': name, 'url': url, 'path': path})
        elif node.get('type') == 'folder':
            new_path = f"{path}/{node.get('name', '')}" if path else node.get('name', '')
            for c in node.get('children', []):
                results.extend(walk(c, new_path))
    return results


def main() -> int:
    ap = argparse.ArgumentParser(description="扫描 Chrome 书签中视频生成相关内容,生成 inbox 任务")
    ap.add_argument('--bookmarks', type=Path, default=DEFAULT_CHROME, help="Chrome Bookmarks JSON 路径")
    ap.add_argument('--out', type=Path, default=DEFAULT_INBOX, help="inbox 输出目录")
    ap.add_argument('--dry-run', action='store_true', help="只打印,不写入")
    args = ap.parse_args()

    if not args.bookmarks.exists():
        print(f"ERROR: {args.bookmarks} 不存在", file=sys.stderr)
        return 2

    data = json.loads(args.bookmarks.read_text(encoding='utf-8'))

    # 收集
    all_bm = []
    for r in data.get('roots', {}).values():
        if isinstance(r, dict):
            for c in r.get('children', []):
                all_bm.extend(walk(c, r.get('name', '')))

    # 去重 + 分类
    seen = set()
    categorized = {}
    for b in all_bm:
        if b['url'] in seen:
            continue
        seen.add(b['url'])
        cat, cat_name = categorize(b['name'], b['url'])
        categorized.setdefault(cat, {'name': cat_name, 'items': []})
        categorized[cat]['items'].append(b)

    print(f"扫描到 {len(all_bm)} 个相关书签,去重后 {sum(len(c['items']) for c in categorized.values())} 个")
    print(f"分类: {len(categorized)} 个\n")

    if args.dry_run:
        for cat_id in sorted(categorized.keys()):
            n = len(categorized[cat_id]['items'])
            print(f"  {cat_id:30} {n:2d} 个 - {categorized[cat_id]['name']}")
        return 0

    # 清理旧视频生成 inbox
    for old in args.out.glob('*video*.md'):
        old.unlink()

    args.out.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')

    # 排序输出
    sort_order = [
        'model-sora', 'model-veo', 'model-kling', 'model-seedance', 'model-dreamina',
        'model-hunyuan', 'model-cogvideo', 'model-vidu', 'model-pixverse', 'model-wan',
        'model-runway', 'model-pika', 'model-luma',
        'short-drama-tools', 'one-click-generators', 'subtitle-notes',
        'video-tooling', 'prompts-skills', 'other',
    ]

    total = 0
    written = 0
    for cat_id in sort_order:
        if cat_id not in categorized:
            continue
        cat = categorized[cat_id]
        n = len(cat['items'])
        total += n

        links_md = '\n'.join([f"- [{item['name']}]({item['url']})" for item in cat['items']])
        body = f"""# 测试:{cat['name']}({n} 个工具/资源)

[high] kb://video-generation/{cat_id}

## 任务
- [ ] 阅读每个链接,提取关键概念和技能
- [ ] 整理出"如何更好生成视频"的方法论
- [ ] 输出到 `D:\\学习院\\my-wiki\\AI知识库\\` 下新建 `11-video-generation/` 分类
- [ ] 每个工具/模型写一个子文件,内容包含:是什么、怎么用、什么场景

## 背景
- 来源:Chrome 书签扫描
- 扫描时间:{datetime.now(timezone.utc).isoformat()}
- 分类:{cat['name']}
- 数量:{n} 个

## 资源列表
{links_md}

## 自动提示
这是 loop-engineering 的**视频生成专项测试**任务。完成后请在 memory.md 留一行:
`video-gen-test | {cat['name']} | <1句话总结>`
"""
        filename = f"{stamp}-video-gen-{cat_id}.md"
        (args.out / filename).write_text(body, encoding='utf-8')
        written += 1
        print(f"  ✓ {cat_id:30} {n:2d} 个 → {filename}")

    print(f"\n总计: {total} 个书签 → {written} 个 inbox 文件")
    return 0


if __name__ == "__main__":
    sys.exit(main())

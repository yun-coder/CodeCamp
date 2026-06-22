"""
intentos.scenarios
==================

场景路由：把用户的中文意图映射到一个"OS 卡片"渲染方案。

为什么不让 LLM 直接返回 HTML？
- LLM 容易编造/截断 HTML；
- 场景里有大量硬数据（"8.2%"、"24,891 张照片"）需要精确展示；
- 卡片布局/交互细节需要确定性。

所以设计为：
  1. LLM 负责生成"自由文本回复"（说人话的部分）；
  2. 路由器根据 prompt 关键词/语义选一个场景；
  3. 场景函数用真实数据（hard-coded mock）渲染中心 canvas。
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable


# ------------------------------------------------------------------
# 场景定义
# ------------------------------------------------------------------
@dataclass
class Scenario:
    """一个场景 = 触发条件 + 文本生成器（可选）+ 中心画布 HTML。"""

    id: str
    title: str
    description: str
    triggers: list[str]  # 匹配关键词（任一命中即触发）
    canvas_html: str  # 中心画布的 HTML（中文 UI）
    sources: list[dict] = field(default_factory=list)  # 右侧 rail 卡片
    activity: list[str] = field(default_factory=list)  # 活动流文案
    tag: str = ""  # 消息标签（CONTINUE / EDIT / SEARCH...）
    requires_llm: bool = True  # 这个场景是否需要 LLM 自由生成


# ------------------------------------------------------------------
# 8 个炸裂场景
# ------------------------------------------------------------------
SCENARIOS: list[Scenario] = [
    # === 1. 主动续接（开机问候） ===
    Scenario(
        id="welcome",
        title="开机主动续接",
        description="OS 在开机时主动续接上次工作，并提示未读事项。",
        triggers=["开机", "继续", "回来", "上次", "上次的工作"],
        requires_llm=False,  # 这是固定台词，不调 LLM
        canvas_html="""
<div class="card">
  <div class="card-title">▣ 上次工作 · 自动续接</div>
  <div class="card-sub">Q3 财务分析草稿 · draft 3/5 · 3 天前</div>
  <div class="card-body">
    <p>在你离开的 3 天里：</p>
    <ul>
      <li><span class="dot dot-warn"></span> 小李在 §2 segment breakdown 留了 2 条评论</li>
      <li><span class="dot dot-info"></span> 2 个未读 Slack 线程（#finance-alerts）</li>
      <li><span class="dot dot-err"></span> 明天 15:00 日历冲突</li>
      <li><span class="dot dot-info"></span> 深圳团队推送了 14 个 commit 等你 review</li>
    </ul>
  </div>
</div>
""",
        sources=[
            {"title": "q3_financial_draft.md", "body": "draft 3/5 · 4 sources linked", "meta": "auto-saved"},
            {"title": "slack #finance-alerts", "body": "2 unread threads", "meta": "live"},
        ],
        activity=["已从 3 天前的快照恢复 Q3 财报草稿", "检测到 2 条未读评论"],
        tag="PROACTIVE",
    ),
    # === 2. 语义搜索（照片） ===
    Scenario(
        id="photo_search",
        title="自然语言照片搜索",
        description="用一句话描述要找的照片，OS 跨整库做语义匹配。",
        triggers=["照片", "图片", "京都", "樱花", "大理", "云南", "找一张", "去年"],
        canvas_html="""
<div class="card">
  <div class="card-title">▣ 照片搜索 · "去年在京都拍的、妈妈和樱花树的那张照片"</div>
  <div class="card-sub">已扫描 24,891 张照片 · 4 个候选 · top match 0.94</div>
  <div class="photo-grid">
    <div class="photo match"><div class="photo-emoji">🌸</div><div class="photo-cap">2025-04-02 · 哲学之道 · 0.94</div></div>
    <div class="photo"><div class="photo-emoji">🌸</div><div class="photo-cap">2025-04-03 · 円山公園 · 0.78</div></div>
    <div class="photo"><div class="photo-emoji">🌸</div><div class="photo-cap">2025-04-04 · 蹴上 · 0.71</div></div>
    <div class="photo"><div class="photo-emoji">🌸</div><div class="photo-cap">2025-04-05 · 祇園 · 0.62</div></div>
  </div>
  <div class="hint">💡 提示：你可以说"那张妈妈在笑的"——OS 理解意图，不只是关键词。</div>
</div>
""",
        sources=[
            {"title": "intent_resolution", "body": '"mom + cherry blossom + kyoto + 2025" → 4 photos', "meta": "0.94 confidence"},
            {"title": "face_index_v3", "body": "已识别妈妈的脸（本地，不上传云）", "meta": "privacy-first"},
        ],
        activity=["扫描 24,891 张照片 · 18ms", "语义匹配 → 4 个候选"],
        tag="SEMANTIC_SEARCH",
    ),
    # === 3. 改写段落（带修订历史） ===
    Scenario(
        id="rewrite",
        title="段落改写（保留原文 + 修订历史）",
        description="让 OS 重写一段文字，原始版本被划掉、新版本高亮、可回滚。",
        triggers=["重写", "改写", "悲观", "改一下", "rewrite", "修改"],
        canvas_html="""
<div class="card">
  <div class="card-title">▣ Q3 财务分析 · §2 Segment Breakdown</div>
  <div class="card-sub">draft 3.0 → draft 3.1 · tone shift: -0.8σ</div>
  <div class="doc">
    <p><span class="strike">我们将下滑归因于典型的 Q3 季节性，以及三笔大订单续约延期至 Q4 的影响。</span></p>
    <p class="rewrite">Enterprise 板块 −14.6% 的同比下滑，<strong>不是季节性波动</strong>。
       三笔原计划在 Q3 关闭的大单延期，pipeline 显示至少两笔 Q4 也会重蹈覆辙。
       如果趋势延续，我们面对的是一次<em>结构性收入下台阶</em>，而非单季错位。</p>
  </div>
</div>
""",
        sources=[
            {"title": "revision_history", "body": "draft 3.0 → 3.1 · 1 paragraph diff", "meta": "rollbackable"},
            {"title": "tone_analyzer", "body": "悲观度: -0.8σ (从 +0.2 到 -0.6)", "meta": "audited"},
        ],
        activity=["重写 §2 · 1 段 · 语气偏悲观", "已记录 revision v3.1"],
        tag="EDIT",
    ),
    # === 4. 复合操作（发邮件 + 约会议） ===
    Scenario(
        id="compound",
        title="复合操作（邮件 + 日历 + 冲突检测）",
        description="一句话里包含多个任务，OS 自动分解并检测冲突。",
        triggers=["发给", "邮件", "约他", "约会议", "约一下", "发邮件", "meeting"],
        canvas_html="""
<div class="card">
  <div class="card-title">▣ 复合任务 · 邮件 + 日历邀请</div>
  <div class="card-sub">检测到 1 个日历冲突，待你确认</div>
  <div class="email">
    <div class="email-row"><span class="lbl">To</span> 小李 &lt;xiaoli@company.com&gt;</div>
    <div class="email-row"><span class="lbl">Subject</span> Q3 财务分析 — 修订版求 review</div>
    <div class="email-body">
      小李，<br>
      附件是 Q3 财报的更新版。我把 §2 segment breakdown 重写得更悲观了，<br>
      反映 enterprise segment 真实的下滑。明天下午 15:00 想跟你同步 Q4 计划，能聊聊吗？
    </div>
    <div class="email-attach">📎 q3_financial_draft_v3.1.pdf <span class="auto">auto-attached</span></div>
  </div>
  <hr class="card-hr">
  <div class="meeting">
    <div class="meeting-row"><strong>提议会议：</strong> 2026-06-19 15:00–15:30</div>
    <div class="conflict">⚠ 冲突：你明天的 14:30 standup 通常开到 15:00 整。建议改到 15:15。</div>
    <div class="actions">
      <button class="btn btn-primary" data-confirm="1500">✓ 15:00 发送</button>
      <button class="btn" data-confirm="1515">↻ 改到 15:15</button>
      <button class="btn btn-danger" data-confirm="cancel">✗ 取消</button>
    </div>
  </div>
</div>
""",
        sources=[
            {"title": "calendar", "body": "14:30 standup 通常 30 min", "meta": "pattern detected"},
            {"title": "gmail", "body": "xiao li 对话历史 47 封", "meta": "context loaded"},
        ],
        activity=["起草邮件 · 等待确认", "检测到日历冲突 · 15:00"],
        tag="COMPOUND_ACTION",
    ),
    # === 5. 周报 ===
    Scenario(
        id="weekly",
        title="一周回顾（自动汇总 git/slack/calendar）",
        description="OS 跨多个数据源汇总一周行为，生成可视周报。",
        triggers=["周报", "做了什么", "这周", "weekly", "recap", "总结"],
        canvas_html="""
<div class="card">
  <div class="card-title">▣ 本周回顾 · 2026-06-12 → 2026-06-18</div>
  <div class="card-sub">自动汇总自 git / slack / calendar / 健身手环</div>
  <div class="stat-row">
    <div class="stat"><div class="stat-num">2</div><div class="stat-lbl">上线功能</div></div>
    <div class="stat"><div class="stat-num">14</div><div class="stat-lbl">Review PR</div></div>
    <div class="stat"><div class="stat-num">2.1k</div><div class="stat-lbl">写代码行数</div></div>
    <div class="stat"><div class="stat-num">6.5h</div><div class="stat-lbl">会议时间</div></div>
  </div>
  <div class="hl">
    <p>▸ 合并了 Q3 dashboard 重构（Wed，4 个 reviewer）</p>
    <p>▸ 合并了通知管道（Fri，2 个 reviewer）</p>
    <p>▸ 退回 2 个 PR（深圳团队的 API contract 漂移）</p>
    <p class="warn">▸ 跳过了 2 次健身房 ⚠</p>
  </div>
</div>
""",
        sources=[
            {"title": "git: pixelforge", "body": "14 commits, 2.1k lines, 14 PRs", "meta": "aggregated"},
            {"title": "slack", "body": "47 threads replied", "meta": "aggregated"},
            {"title": "calendar", "body": "13 meetings, 6.5h total", "meta": "aggregated"},
            {"title": "garmin", "body": "2/4 健身房 sessions", "meta": "privacy-first"},
        ],
        activity=["跨 4 个数据源汇总本周", "已识别 2 个高光 + 1 个警告"],
        tag="RECAP",
    ),
    # === 6. 出差规划（多 API 复合 + 主动建议） ===
    Scenario(
        id="trip",
        title="一句话规划出差（机票+酒店+行程+家庭通知）",
        description="OS 主动查询航班/酒店/日历/家庭偏好，给出完整方案。",
        triggers=["出差", "上海", "北京", "旅行", "trip", "机票", "酒店"],
        canvas_html="""
<div class="card">
  <div class="card-title">▣ 下周上海出差规划</div>
  <div class="card-sub">已查 4 个 API（航班/酒店/日历/家庭） · 1 个提案待你拍板</div>
  <div class="itinerary">
    <div class="leg"><div class="leg-day">周二 06-24</div><div class="leg-line">07:30 浦东 → 09:55 虹桥 · 东航 MU5103 · 经济 ¥1,840</div></div>
    <div class="leg"><div class="leg-day">周二 06-24</div><div class="leg-line">11:00 入住 虹桥雅高美居 · 行政房 ¥680/晚 × 2 晚</div></div>
    <div class="leg"><div class="leg-day">周三 06-25</div><div class="leg-line">10:00 拜访客户 A（陆家嘴）· 14:00 客户 B（静安）· 16:30 客户 C（徐汇）</div></div>
    <div class="leg"><div class="leg-day">周四 06-26</div><div class="leg-line">08:30 返程 · 虹桥 → 浦东 · 国航 CA1858 · ¥1,720</div></div>
  </div>
  <div class="family">
    <div class="family-row">👨‍👩‍👧 家庭偏好：女儿周三上午有钢琴课，你出差期间老婆希望有人在 17:30 接她。</div>
    <div class="family-row">📱 已草拟一条消息发到家庭群："我周三晚回，明天妈妈接娃辛苦啦 ❤️"</div>
  </div>
</div>
""",
        sources=[
            {"title": "ctrip", "body": "已查 32 个航班 + 18 家酒店", "meta": "best price found"},
            {"title": "calendar", "body": "3 个客户会议已排入", "meta": "auto-arranged"},
            {"title": "family_chat", "body": "女儿周三 17:30 钢琴课", "meta": "context aware"},
        ],
        activity=["查询 4 个 API · 2.4s", "识别家庭冲突 · 主动建议"],
        tag="TRIP_PLAN",
    ),
    # === 7. 多模态相册（电子相册生成） ===
    Scenario(
        id="album",
        title="一句话生成电子相册",
        description="OS 自动从指定主题的照片库挑图、选曲、生成可分享相册。",
        triggers=["相册", "云南", "大理", "整理照片", "做个相册", "album"],
        canvas_html="""
<div class="card">
  <div class="card-title">▣ 云南大理相册 · 2023 夏</div>
  <div class="card-sub">从 142 张原片精选 23 张 · 已生成 12 页可分享电子相册</div>
  <div class="album-cover">
    <div class="album-title">2023 · 大理的风</div>
    <div class="album-sub">23 张 · 洱海 / 苍山 / 古城 / 喜洲</div>
    <div class="album-meta">⏱ 翻页配乐：竖琴 + 风声 (4'32")</div>
  </div>
  <div class="album-pages">
    <div class="page-num">12 页 · 已生成 PDF + 在线链接 · 可发朋友圈</div>
  </div>
  <div class="actions">
    <button class="btn btn-primary">📤 分享到家庭群</button>
    <button class="btn">🖨 导出 PDF</button>
    <button class="btn">🎵 换配乐</button>
  </div>
</div>
""",
        sources=[
            {"title": "exif_cluster", "body": "GPS 聚类 → 4 个地点", "meta": "auto-organized"},
            {"title": "aesthetic_scorer", "body": "构图/曝光/情感分 · top 23", "meta": "ranked"},
        ],
        activity=["聚类 142 张照片 → 4 地点", "美学评分 → 挑出 23 张", "生成 12 页电子相册"],
        tag="CREATIVE",
    ),
    # === 8. 隐私警告（跨域数据） ===
    Scenario(
        id="privacy",
        title="跨域数据访问 · 隐私警告",
        description="当用户请求 OS 访问家庭/配偶数据时，OS 主动告知并征求同意。",
        triggers=["老婆", "购物车", "她", "购物", "礼物", "surprise", "惊喜"],
        canvas_html="""
<div class="card card-warn">
  <div class="card-title">⚠ 跨域数据访问请求</div>
  <div class="card-sub">即将访问：家庭共享数据 · 影响 1 个其他用户</div>
  <div class="privacy">
    <p><strong>你刚刚让 OS 查看老婆的购物车。</strong></p>
    <p>这件事本质上是 OS 替你看她不想让你看的东西，即使动机是浪漫的。</p>
    <p>IntentOS 的设计原则：<strong>每个用户都拥有自己的数据空间</strong>，跨域访问需要双重确认。</p>
  </div>
  <div class="privacy-options">
    <div class="opt">
      <div class="opt-title">选项 A · 主动通知</div>
      <div class="opt-body">告诉老婆"我让 OS 看了一下你的购物车"，让她决定是否展示。</div>
    </div>
    <div class="opt">
      <div class="opt-title">选项 B · 模糊访问</div>
      <div class="opt-body">只看公开数据（朋友圈点赞、最近搜索），不读购物车。</div>
    </div>
    <div class="opt">
      <div class="opt-title">选项 C · 改用你自己的数据</div>
      <div class="opt-body">翻你老婆的朋友圈、聊天记录，间接推断她想要什么。</div>
    </div>
  </div>
  <div class="actions">
    <button class="btn btn-primary" data-confirm="A">采用 A · 通知</button>
    <button class="btn" data-confirm="B">采用 B</button>
    <button class="btn" data-confirm="C">采用 C</button>
    <button class="btn btn-danger" data-confirm="X">✗ 取消</button>
  </div>
</div>
""",
        sources=[
            {"title": "privacy_layer", "body": "detected cross-account access", "meta": "audit ON"},
        ],
        activity=["检测到跨域数据访问请求", "提出 3 种合规方案"],
        tag="PRIVACY",
    ),
]


# ------------------------------------------------------------------
# 路由
# ------------------------------------------------------------------
def route(prompt: str) -> Scenario | None:
    """根据 prompt 命中一个场景。None 表示没命中，走默认欢迎。"""
    prompt_low = prompt.lower()
    best: tuple[int, Scenario] | None = None
    for s in SCENARIOS:
        for kw in s.triggers:
            if kw.lower() in prompt_low:
                # 长关键词优先（更精确）
                score = len(kw)
                if best is None or score > best[0]:
                    best = (score, s)
                break
    return best[1] if best else None


def all_scenarios_for_demo() -> list[Scenario]:
    """完整 demo 用的场景列表。"""
    return SCENARIOS[1:]  # 跳过 welcome，由前端独立触发

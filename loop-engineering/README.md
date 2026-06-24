# loop-engineering

> 一个能自己挑活、自己隔离环境改代码、自己验证、留下记忆的小型自动化引擎。
> 基于 Addy Osmani《Loop Engineering》橙皮书实现，五动作 + 六零件 + 八 gate。
>
> **2026-06-24 重大更新**：书签流程已废弃，系统**只依赖本地 AI 知识库**作为唯一信息源。

---

## 🎯 一句话

把"我手动写 prompt 调 agent"换成"我设计循环，让 agent 自己转"。Agnes 写代码，8 个硬规则评判，留痕到 memory.md。

**单一信息源**：`D:\学习院\my-wiki\AI知识库\`（10 个分类，354 个 provider）

---

## 🏗️ 项目架构

```
                       ┌──────────────────────────────────────┐
                       │       loop-engineering 主循环         │
                       │       (per 5 min / per inbox)        │
                       └────────────────┬─────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌──────────────┐               ┌──────────────┐               ┌──────────────┐
│  ① 发现层     │               │  ② 交付层     │               │  ③ 起草层     │
│  Discover    │               │  Handoff     │               │  Draft       │
├──────────────┤               ├──────────────┤               ├──────────────┤
│ inbox/*.md   │               │ git worktree │               │  Agnes API   │
│              │               │              │               │  (apihub)    │
│ 来源:        │               │ 隔离分支,    │               │              │
│  - 手动塞    │               │ 不污染主线,  │               │ 读 inbox +   │
│  - KB 扫描   │               │ 通过即 merge │               │ SKILL 约束,  │
│              │               │              │               │ 写代码 +     │
│              │               │              │               │ git commit   │
└──────┬───────┘               └──────┬───────┘               └──────┬───────┘
       │                              │                              │
       │       ┌──────────────────────┴──────────────────────┐       │
       │       │                                             │       │
       │       ▼                                             ▼       │
       │  ┌──────────────┐                              ┌──────────────┐
       │  │ connectors/  │                              │  ④ 评判层     │
       │  │ - kb_bridge  │                              │  Evaluator   │
       │  └──────────────┘                              │  (8 个 gate) │
       │                                                 │              │
       │                                                 │ 确定性 Python,│
       │                                                 │ 不调 LLM,    │
       │                                                 │ LLM 跳不过   │
       │                                                 └──────┬───────┘
       │                                                        │
       │       ┌────────────────────────────────────────────────┘
       │       ▼
       │  ┌──────────────────────────────────────────────┐
       │  │  ⑤ 持久化层  Memory                           │
       │  │  state/memory.md (append-only)                │
       │  │                                                │
       │  │  格式: <ISO时间> | <wt-slug> | pass/fail | 摘要 │
       │  │                                                │
       │  │  关键: agent 忘,repo 不忘。                    │
       │  │       记忆必须落盘,不能在对话上下文。           │
       │  └──────────────────────────────────────────────┘
       │
       └───────────→ 循环回到 ① 发现层

═══════════════════════════════════════════════════════════════════════════

外部依赖（极简）:
  ┌────────────┐   ┌────────────┐   ┌────────────┐
  │  Agnes AI  │   │  本地 KB    │   │  本地 inbox  │
  │ apihub     │   │ my-wiki/    │   │ inbox/*.md  │
  │ OpenAI 兼容 │   │ AI知识库/   │   │ 手动塞/扫描  │
  └────────────┘   └────────────┘   └────────────┘
       ↑                 ↑                  ↑
       │    通过 .env / 环境变量配置        │
       │                                    │
       └────── loop-engineering ────────────┘

═══════════════════════════════════════════════════════════════════════════

调度(可选,无人值守):
  ┌─────────────────┐
  │ cron_loop.sh    │  每 5 分钟一圈
  │                 │
  │ Windows 任务计划 │  或 /loop 5m $loop-triage (Claude Code)
  │ 或 GitHub Actions│  或 cloud routines
  └─────────────────┘
```

---

## 📁 目录结构

```
loop-engineering/
├── .env                        # Agnes 配置(你自己填,git 忽略)
├── .env.example                # 配置模板
├── .gitignore                  # 含 .env / .worktrees / inbox 排除
├── README.md                   # 本文件
├── run.sh                      # 入口(discover / prepare / draft / evaluate / status / ingest-kb)
├── loop.sh                     # draft wrapper(独立,不受 worktree 操作污染)
│
├── connectors/                 # §04 零件四 · Connectors
│   ├── agnes_client.py         # Agnes OpenAI 兼容客户端 + .env 加载 + mock fallback
│   ├── draft_runner.py         # §03 动作三·起草:在 worktree 里调 Agnes 改代码
│   └── kb_bridge.py            # 递归扫本地 AI知识库 → 生成复盘 inbox
│
├── evaluator/                  # §04 零件五 · Sub-agents(用确定性 Python 代替)
│   └── gate.py                 # 8 个 gate,G1-G8
│
├── inbox/                      # §03 动作一·发现的输入
│   └── *.md                    # 每个文件=一个待办任务
│
├── state/                      # §04 零件六 · Memory
│   └── memory.md               # append-only,每行一个事件
│
├── .worktrees/                 # §04 零件二 · Worktrees(隔离区)
│   └── wt-<时间戳>-<slug>/     # 每个待办一个 worktree
│
├── scheduler/
│   └── cron_loop.sh            # §06 第三个案例·Cloud Routines 替代
│
└── .claude/skills/loop-triage/ # §04 零件三 · Skills(给 Claude Code 用的指导)
    └── SKILL.md                # (可选,不用 Claude Code 也行)
```

---

## ⚙️ 配置

复制 `.env.example` 为 `.env`,填你的真值:

```bash
# 必填:你的 Agnes API Key
AGNES_API_KEY=sk-agn-...

# 必填:API 地址(Agnes 是 apihub,不是 api)
AGNES_BASE_URL=https://apihub.agnes-ai.com/v1

# 必填:模型名(看你账号开通了哪些)
AGNES_MODEL=agnes-2.0-flash
```

**读取顺序**(后者覆盖前者):

| 优先级 | 来源 | 适合场景 |
|---|---|---|
| 1 | 系统环境变量 | CI / 临时调试 |
| 2 | `.env` 文件 | 本地开发(**推荐**) |
| 3 | 代码内默认值 | fallback |

**无 Key 自动走 mock**——mock 返回固定模板,用于本地测试管道通不通。

---

## 📚 单一信息源:本地 AI 知识库

**位置**：`D:\学习院\my-wiki\AI知识库\`

**结构**（10 个分类，共 354 个 provider）：

| 分类 | 数量 | 说明 |
|------|------|------|
| `01-chat-models/` | 40 | 聊天模型：GPT-4、Claude、Qwen、GLM、DeepSeek、Minimax 等 |
| `02-embedding-models/` | 4 | 嵌入模型：把文字变成向量 |
| `03-vector-stores/` | 66 | 向量数据库：Chroma、Milvus、Qdrant、Pinecone、Weaviate 等 |
| `04-document-loaders/` | 70 | 文档加载器：PDF/Word/网页/Notion/Slack/YouTube 等 |
| `05-tools/` | 30 | AI 工具：搜索、爬虫、计算、Stripe、Slack、Git 等 |
| `06-memory/` | 3 | 记忆系统：Mem0、Zep、Cortex |
| `07-agent-orchestration/` | 1 | Agent 编排：DSPy |
| `08-monitoring/` | 55 | 监控评估：LangSmith、Helicone、MLflow 等 |
| `09-deployment/` | 66 | 部署推理：vLLM、TGI、Modal、AWS、阿里云、腾讯云 等 |
| `10-search-retrieval/` | 19 | 搜索检索：Google、Bing、Brave、Exa、Tavily 等 |

**数据来源**：[LangChain 中文网](https://www.langchain.com.cn/docs/integrations/providers/) 301 个 provider 全部收录。

---

## 🚀 快速开始

### 1. 准备 inbox

```bash
# 方式 A:从本地知识库生成复盘任务
bash run.sh ingest-kb

# 方式 B:手动塞
echo "# 任务标题
[high] https://example.com
" > inbox/my-task.md
```

### 2. 跑一圈完整闭环

```bash
# 看 inbox
bash run.sh discover

# 开 worktree
bash run.sh prepare inbox/<某个文件>.md

# 调 Agnes 起草代码 + commit(走真 .env)
bash loop.sh draft inbox/<某个文件>.md

# 跑 8 个 gate 验证
bash run.sh evaluate

# 通过 → merge 回主分支
git merge --no-ff loop/wt-... -m "merge: 消化了 X"
```

### 3. 无人值守(可选)

```bash
# Windows 任务计划程序:每 5 分钟跑一次
# 程序:D:\Git\mingw64\bin\bash.exe
# 参数:D:\学习院\CodeCamp\loop-engineering\scheduler\cron_loop.sh
# 起始于:D:\学习院\CodeCamp\loop-engineering
```

---

## 🛡 八个 gate

每次起草完成，`evaluator/gate.py` 会跑这 8 个硬规则，**LLM 跳不过**：

| # | 检查 | 触发条件 | 典型 FAIL |
|---|------|----------|-----------|
| G1 | diff 非空 | worktree 相对 main 无改动 | 空 commit |
| G2 | 路径白名单 | 修改落在 `src/ tests/ docs/ kb/ inbox/` 之外 | 改 `.env` / `run.sh` |
| G3 | 无禁止标记 | diff 含 `TODO` / `FIXME` / `print()` / `console.log()` / bare except | "minor fix" 偷懒 |
| G4 | token 上限 | diff 字符数/3 > 50000 | agent 失控 |
| G5 | commit 有"为什么" | message 长度 <20 或缺 because/so that/refs/closes | "minor update" |
| G6 | 跑测试 | 改 `agent_platform` / `loop-engineering` 时自动跑 pytest | 真跑了才算 |
| G7 | 无 secrets | diff 含 `sk-` / `AKIA` / `AIza` 等 key 模式 | 误 commit Key |
| G8 | 引用来源 | commit 或 diff 含 `kb://` / `refs:` | (软要求,只警告) |

**关键设计**（橙皮书 §05）：evaluator **不能由写代码的同一个 LLM 跑**。否则 model 会给自己开后门。

---

## 📜 五动作详解

对应橙皮书 §03：

| 动作 | 干什么 | 本项目的实现 | 文件 |
|------|--------|--------------|------|
| ① 发现 | 自己找出这圈该做的事 | 读 `inbox/*.md` + `state/memory.md`，优先级排序 | `run.sh discover` |
| ② 交付 | 把任务隔离着交给 agent | `git worktree add .worktrees/wt-...` | `run.sh prepare` |
| ③ 起草 | 换个 agent 说"做" | 调 Agnes API，按 SKILL.md 约束写代码 + commit | `loop.sh draft` → `draft_runner.py` |
| ④ 验证 | 换个 agent 说"不" | 跑 8 个 gate，FAIL 即拒绝 | `evaluator/gate.py` |
| ⑤ 持久化 | 把状态写到对话之外 | `state/memory.md` append + git commit | (自动) |

---

## 🔧 六零件清单

对应橙皮书 §04：

| 零件 | 对应动作 | 本项目实现 |
|------|----------|-----------|
| Automations | 调度 | `scheduler/cron_loop.sh` + (可选) Windows 任务计划 |
| Worktrees | 交付 | `git worktree add .worktrees/wt-...` |
| Skills | 发现 | `.claude/skills/loop-triage/SKILL.md` + `connectors/*.py` |
| Connectors | 持久化 | `connectors/kb_bridge.py` |
| Sub-agents | 验证 | `evaluator/gate.py`（用确定性 Python 代替 LLM 评判） |
| Memory | 持久化 | `state/memory.md`（append-only） |

---

## 🧠 Agnes 配置速查

文档：[apihub.agnes-ai.com](https://apihub.agnes-ai.com)

| 项 | 值 |
|---|---|
| Base URL | `https://apihub.agnes-ai.com/v1` |
| 协议 | OpenAI 兼容 |
| 认证 | `Authorization: Bearer ***` |
| 可用模型（查 `/models` 端点） | 看你的账号开通了哪些 |

**通过 GET `/models` 列账号开通的模型**：

```python
import httpx
r = httpx.get(
    "https://apihub.agnes-ai.com/v1/models",
    headers={"Authorization": f"Bearer {你的key}"},
)
print(r.json())
```

---

## 🚨 常见问题

### Q: 跑 `bash run.sh draft` 显示 mock，但 .env 有 key?

A: 用 `bash loop.sh draft` 而不是 `bash run.sh draft`。`run.sh` 在 git worktree 操作时可能被覆盖回 HEAD 版本，`loop.sh` 是独立 wrapper，不受影响。

### Q: 8 个 gate 都过了，但代码逻辑错了怎么办？

A: gate 只挡**形式问题**（TODO、空 commit、secret），不挡**业务逻辑错误**。这正是橙皮书 §05 的设计：LLM 评判有偏，但确定性规则不会放过烂形式。业务判断依然要人 review。

### Q: Agnes 返回的不是合法 JSON？

A: `connectors/draft_runner.py` 会打印原始返回（前 500 字符）。通常是 model 选了不对——换个 `AGNES_MODEL=agnes-1.5-flash` 试试。

### Q: 想用 Claude Code 而不是 Agnes？

A: 可以，但不推荐（橙皮书强调"写代码的不能自己评判"，用 Claude Code 后，gate 仍是独立 Python，逻辑不变）。直接编辑 `connectors/agnes_client.py` 加 Claude 客户端，保留同样的 `chat(messages)` 接口。

---

## 📋 TODO

- [ ] 把 scheduler 接进 GitHub Actions（睡觉也跑）
- [ ] memory.md >100 行自动 archive
- [ ] G6 加超时保护（目前 180 秒）
- [ ] 多个 inbox 任务并行处理
- [ ] Linear / Slack connector（替代 inbox/*.md）

---

## 📖 参考

- 橙皮书：Addy Osmani《Loop Engineering》（v260615）
- 核心论点：**Loop engineering is replacing yourself as the person who prompts the agent. You design the system that does it instead.**
- 本仓库是橙皮书 §03 五动作 + §04 六零件 + §05 评判器 的最小可运行实现

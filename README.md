# CodeCamp

个人 AI 学习项目集合。这个仓库用于集中索引、保存和实验多个 AI、Agent、RAG、视频生成、知识管理及工具类项目，方便横向学习、对比技术栈和沉淀本地实践。

> **最后更新：** 2026-11-10
> **当前项目总数：** 27 个子项目（按根目录实际目录核验）
> **目录结构：** 扁平化根目录，按领域分类索引

---

## 项目识别

- **仓库定位**：个人学习型 monorepo / 项目索引仓库。
- **主要主题**：AI/Agent 学习资料、LLM 应用、知识管理、媒体生成、内容平台与开发工具。
- **组织方式**：所有项目平铺在根目录，本 README 按领域分类索引。各子项目保留自己的 README、依赖文件和运行方式。
- **维护重点**：新增、删除或移动项目时，同步更新本 README 的分类列表、项目总数和“安装与运行状态”一节。

---

## 目录结构

```
CodeCamp/
├── agency-agents/                   # AI Agent 人格库（232 个岗位定义）
├── agent-skills/                    # 工程技能 + 斜杠命令（Addy Osmani）
├── agents-learn/                    # AI Agent 技术栈学习项目（自有实践）
├── ai-agent-book/                   # 《深入理解 AI Agent》书稿 + 88 个实验
├── ai-agents-the-definitive-guide/  # Agent 专题书 12 章 Notebook
├── ai-engineering-from-scratch/     # 523 节课 AI 工程系统课程
├── ai-guide/                        # 鱼皮 AI 知识库（VuePress）
├── AI技能整理/                       # 自整理 AI 主题笔记
├── awesome-ai-apps/                 # 80+ LLM 应用示例
├── claude-skills/                   # 开发流程与工程实践文档
├── content-publishing-platform/     # GEO 品牌内容自动化平台（自有）
├── cyber-xiaoya-live/               # 赛博小雅组件版数字人直播系统
├── digital-human-koubo/             # 数字人口播技能包（含 finance-explainer）
├── file-viewer-main/                # 纯前端多格式文件预览组件
├── GEOSuite/                        # 企业 SEO + GEO 工作台（自有）
├── gstack/                          # 虚拟工程团队技能包（Garry Tan）
├── Hands-On-Large-Language-Models/  # 《Hands-On LLM》配套 Notebook
├── hello-agents/                    # Datawhale 中文智能体教程
├── image-copy/                      # 图生灵 Chrome 扩展（自有）
├── local-deep-research/             # 本地深度研究助手
├── Python-100-Days/                 # Python 全栈 100 天教程
├── PythonCrawler/                   # Python 爬虫示例集合
├── rea-video/                       # 视频逆向拆解与复刻方案
├── skills/                          # Matt Pocock 工程技能集
├── skyline-globe/                   # 全球实时摄像头图谱（自有）
├── xiaozhi-workday-platform/        # 小智工作日记（本地网页小游戏，自有）
├── zz-toolbox/                      # Electron 桌面工具箱
├── README.md
└── 源码阅读笔记.md
```

---

## 项目分类总览

### 📚 AI 与编程学习资料

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [ai-engineering-from-scratch](ai-engineering-from-scratch/) | 523 节课 / 20 阶段的 AI 工程课程，每节课产出一个可复用产物（prompt、skill、agent、MCP server） | Python, TypeScript, Rust, Julia |
| [Hands-On-Large-Language-Models](Hands-On-Large-Language-Models/) | 《Hands-On LLMs》配套代码，按章节组织的 Notebook 实战 | Python, PyTorch, Transformers |
| [Python-100-Days](Python-100-Days/) | Python 全栈 100 天教程，包含 Web 开发、爬虫、数据分析与机器学习 | Python, Django, NumPy, Pandas |
| [awesome-ai-apps](awesome-ai-apps/) | LLM 应用示例集合：starter/simple/advance agent、voice、MCP、memory、RAG、fine-tuning | Python, LangChain, Streamlit |
| [ai-agent-book](ai-agent-book/) | 《深入理解 AI Agent》开源书（10 章）+ 88 个配套实验，五语版本 | Python, LangGraph, MCP, RAG |
| [ai-agents-the-definitive-guide](ai-agents-the-definitive-guide/) | O'Reilly《AI Agents - The Definitive Guide》12 章配套 Notebook | Python, Jupyter |
| [agents-learn](agents-learn/) | 自有 Agent 技术栈实践：RAG、工具调用、记忆、编排、评估与安全，带 CLI 与 FastAPI | Python, LangGraph, Chroma, BGE |
| [hello-agents](hello-agents/) | Datawhale 中文智能体教程，从原理到多智能体应用 | Python, LangGraph, AutoGen, MCP, A2A |
| [AI技能整理](AI技能整理/) | AI 应用全景、前端设计 Skill、页面生成、Claude Code 命令与企业级链路、搜索技巧 | Markdown 笔记 |
| [PythonCrawler](PythonCrawler/) | Requests/Selenium 等采集范例；采集须遵守网站条款与适用法律 | Python |

### 🤖 Agent、技能工作流与提示词

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [agency-agents](agency-agents/) | 232 个 AI 代理人格，跨 16 个专业领域，每个是完整工作手册 | Markdown 定义，多 CLI 兼容 |
| [agent-skills](agent-skills/) | 24 个生产级技能 + 8 个斜杠命令，覆盖 spec→plan→build→test→review→ship | Markdown SKILL.md，插件系统 |
| [skills](skills/) | Matt Pocock 的小型可组合工程技能：需求访谈、TDD、架构改进、缺陷诊断 | Markdown, changesets |
| [claude-skills](claude-skills/) | API 设计、数据库迁移、前端、单元/集成测试与模块交付的流程检查项 | Markdown |
| [gstack](gstack/) | 把 Claude Code 变成虚拟工程团队：CEO 复审、架构、设计、review、浏览器 QA、安全审计、发版 | Markdown + TypeScript/bun + Playwright |
| [digital-human-koubo](digital-human-koubo/) | 一张照片 + 一句话出数字人口播成片的 Agent 技能包，含 finance-explainer 解说技能 | SKILL.md, Remotion, Renoise MCP |

### 🧠 AI 数据、知识管理与研究

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [local-deep-research](local-deep-research/) | 本地化深度研究助手：多检索源、研究策略、加密知识库、带引用报告 | Python, Ollama, LangChain, SQLCipher |

### 🎬 AI 媒体、内容与直播

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [rea-video](rea-video/) | 视频逆向拆解：逐镜头分析画面/文字/剪辑/音频，并给出可执行的复刻方案 | Python, ONNX, RapidOCR |
| [cyber-xiaoya-live](cyber-xiaoya-live/) | 赛博小雅组件版数字人直播：弹幕→动作、舞台页 + 本地桥 + TTS 全链路（形象与 Key 自备） | Python, FastAPI, WebSocket, Vidu |
| [image-copy](image-copy/) | Chrome MV3 扩展：网页图片理解并生成可编辑生图提示词，支持多模型与直接生图 | JavaScript, Gemini/OpenAI API |
| [xiaozhi-workday-platform](xiaozhi-workday-platform/) | 本地“工位小剧场”网页小游戏：选工位、工作/摸鱼、工单倒计时、积分；Live2D 为选装 | Python 标准库, 原生 JS, Live2D |
| [content-publishing-platform](content-publishing-platform/) | GEO 品牌内容平台：资料核验→分平台图文→查重→审核→发布留痕 | Python, SQLite, openpyxl |

### 🧰 内容平台与通用工具

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [GEOSuite](GEOSuite/) | 企业 SEO + GEO 工作台：可抓取性/可引用性/权威信号审计 + AI 搜索可见度监测 | FastAPI, Next.js, Postgres, Qdrant |
| [file-viewer-main](file-viewer-main/) | 纯前端多格式文件预览：Office/PDF/OFD/CAD/压缩包/邮件/媒体/代码，多框架封装 | TypeScript, pnpm monorepo, WASM |
| [skyline-globe](skyline-globe/) | 全球 2141 路实时摄像头图谱：3D 地球/墨卡托切换、聚合点、HLS 代理与 YouTube 嵌入 | React, Vite, MapLibre |
| [zz-toolbox](zz-toolbox/) | Electron 桌面工具箱：打印设计、条码二维码、组件库、画布演练场 | Electron, Vue 3, Vite |
| [ai-guide](ai-guide/) | 鱼皮的 AI 知识库站点源码（VuePress），内容为 AI 工具与教程 | VuePress 1.x |

---

## 安装与运行状态（2026-11-10 核验）

状态按“依赖是否已装、能否直接跑”判定，不等于项目质量。

### 已装好，可直接运行

| 项目 | 状态 |
|---|---|
| gstack | bun 依赖已装，`browse.exe` / `pdf.exe` 已编译，技能已安装进 Codex（`~/.codex/skills`） |
| GEOSuite | 后端 `.venv`（Python 3.13 / uv）+ `frontend/node_modules`；根目录的 `node_modules` 只剩 `.vite`，是空壳 |
| rea-video | `.venv` + 可编辑安装指向本项目，`import rea_video` 正常 |
| skyline-globe | `node_modules` 已装，`dist/` 已构建 |
| content-publishing-platform | `.venv` 与 `requirements.lock` 一致，`install.ps1` 已执行（`data/workspace.json`、`ledger.sqlite3` 存在） |
| cyber-xiaoya-live | `.venv`（Python 3.12 / uv）可运行；形象、音色、API Key 需按 README 自备 |
| xiaozhi-workday-platform | 免安装，`python start.py` 起本地服务（127.0.0.1:28931） |
| image-copy | 免安装，Chrome 开发者模式加载目录即可 |

### 已装但需注意

| 项目 | 状态 |
|---|---|
| agents-learn | `.venv` 曾从旧路径迁移导致解释器失效，2026-11-10 已修复（`pyvenv.cfg`、可编辑安装 `.pth`、activate 脚本、控制台脚本均已重建），`python -m src.cli` 可用 |

### 源码在，依赖未装（改代码前先装一次）

| 项目 | 需要 |
|---|---|
| file-viewer-main | `pnpm install`；`artifacts/` 内有 v2.1.13 全套已发布 tgz，可当成品用 |
| zz-toolbox | `npm install`（含 electron）；`dist/` 是上次构建产物 |
| ai-guide | `npm install`；只看内容可直读 Markdown |
| skills | 技能为 Markdown，直接可用；`package.json` 仅 changesets 开发依赖 |

### 需要外部环境

| 项目 | 依赖 |
|---|---|
| local-deep-research | Docker Compose，或 pdm + Python 3.12+ |

---

## 2026-11-10 变更记录

- **移出**：`Easel` 已迁至 `D:\智茂\Easel`（本仓库不再索引，历史提交仍保留其文件）。
- **删除**：`loop-engineering`、`RuView`、`WeKnora`、`handraw-style` 已从本目录移除。
- **新增**：`cyber-xiaoya-live`、`digital-human-koubo`；此前未入索引的 `gstack`、`rea-video`、`content-publishing-platform`、`xiaozhi-workday-platform`、`ai-guide` 已补入。
- **修正**：`GEOSuite` 早期描述为“地理空间数据处理”，实际是企业 SEO/GEO 工作台，已更正。
- **路径修复**：`agents-learn`（解释器与可编辑安装）、`GEOSuite`（IDE 配置与文档中的 `D:\外贸\GEOSuite`）、`rea-video`（产物中记录的 `D:\rea-video` 路径）。
- **说明**：`源码阅读笔记.md` 记录的是 2026-10-29 的阅读状态，其中已删除或移出的项目仅作历史参考。

---

## 跨项目知识地图

1. **Agent 应用链路**：提示词与上下文 → 模型/结构化输出 → 工具调用 → 状态、记忆与知识检索 → 编排/多 Agent → 评估、安全和可观测性。可对照 `agents-learn`、`hello-agents`、`ai-agent-book`。
2. **RAG 与研究**：文档解析 → 切分/元数据 → Embedding/索引 → 混合检索/重排 → 带引用生成 → 质量评估。对照 `local-deep-research`、`agents-learn` 与 LLM Notebook。
3. **Agent 工程流程**：先写规格和验收标准，拆成小任务，逐步实现；用测试/构建/运行时证据验证，再做审查与发布。对照 `agent-skills`、`skills`、`claude-skills`、`gstack`。
4. **多模态与内容生产**：图片提示词（`image-copy`）、视频逆向与复刻（`rea-video`）、数字人直播（`cyber-xiaoya-live`、`digital-human-koubo`）、平台化内容发布（`content-publishing-platform`）构成从灵感到分发的链路。
5. **前端与桌面集成**：组件化界面、地图/媒体渲染、格式插件、浏览器扩展权限边界、Electron IPC/预加载桥接。对照 `skyline-globe`、`file-viewer-main`、`image-copy`、`zz-toolbox`。
6. **学习资料到工程实践**：课程与书籍用于建立概念，示例仓库用于比较实现；做结论时区分“上游 README 声称”“代码实际实现”“本地运行验证”，不要把项目宣传指标当作已复现结果。

---

## 技术栈分布

| 类别 | 代表 |
|---|---|
| **Python** | agents-learn, GEOSuite, content-publishing-platform, rea-video, cyber-xiaoya-live, local-deep-research |
| **TypeScript/JavaScript** | gstack, file-viewer-main, skyline-globe, zz-toolbox, image-copy |
| **React / Next.js** | skyline-globe, GEOSuite |
| **Vue** | zz-toolbox, ai-guide(文档站点), file-viewer(vue2/vue3 封装) |
| **Docker** | local-deep-research, GEOSuite, agents-learn |
| **AI 供应商** | OpenAI, DeepSeek, Qwen, Gemini, Langfuse, LangSmith, Vidu |

---

## 使用建议

1. 进入具体子项目目录后，优先阅读该目录自己的 `README.md`。
2. 大部分项目来自上游开源仓库，每个子目录有独立的 `.git`；更新时进入对应子目录 `git pull`。
3. 本地实验项目（`agents-learn`、`GEOSuite`、`content-publishing-platform`、`skyline-globe`、`xiaozhi-workday-platform`、`image-copy`）无 `.git` 或为自有仓库，改动直接维护在本地。
4. 大模型权重、数据集、渲染产物、缓存、密钥和本地数据库不提交到根仓库。
5. 项目跨目录移动后，先检查 `.venv`（`pyvenv.cfg`、可编辑安装 `.pth`、`activate` 脚本）和 IDE 配置里的绝对路径，再检查代码中硬编码的旧路径。

---

## 维护规则

- 新增、删除或移动根目录项目时，更新“最后更新”日期、项目总数、目录结构、分类列表和“安装与运行状态”。
- 新项目根据其功能放入对应分类；不确定时归入“内容平台与通用工具”。
- 根 `.gitignore` 只维护通用规则；子项目专属规则放在子项目自己的 `.gitignore` 中。
- 不要提交 `.env`、模型权重、临时输出、IDE 缓存、依赖安装目录和大型数据文件。
- 所有项目平铺在根目录，通过本 README 的分类索引组织。

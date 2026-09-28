# CodeCamp

个人 AI 学习项目集合。这个仓库用于集中索引、保存和实验多个 AI、Agent、RAG、视频生成、知识管理及工具类项目，方便横向学习、对比技术栈和沉淀本地实践。

> **最后更新：** 2026-09-28  
> **当前项目总数：** 27 个  
> **目录结构：** 扁平化根目录，按领域分类索引

---

## 项目识别

- **仓库定位**：个人学习型 monorepo / 项目索引仓库。
- **主要主题**：AI/Agent 学习资料、LLM 应用、知识管理、媒体生成、空间智能、开发工具和内容平台。
- **组织方式**：所有项目平铺在根目录，本 README 按领域分类索引。各子项目保留自己的 README、依赖文件和运行方式。
- **维护重点**：新增或删除项目时，同步更新本 README 的分类列表。

---

## 目录结构

```
CodeCamp/
├── aella-data-explorer/             # 科学论文语义探索
├── agency-agents/                   # AI Agent 人格库
├── agent-skills/                    # Agent 工作流技能
├── agents-learn/                    # AI Agent 技术栈学习与实践
├── ai-agent-book/                   # AI Agent 设计原理
├── ai-agents-the-definitive-guide/  # AI Agent 专题书配套代码
├── ai-engineering-from-scratch/     # AI 工程系统课程
├── AI技能整理/                       # AI 技能学习资料
├── awesome-ai-apps/                 # LLM 应用示例
├── claude-skills/                   # Claude 开发流程文档
├── creatorhub/                      # 多平台内容管理
├── Crucix/                          # OSINT 情报仪表盘
├── dramaclaw/                      # AI 短剧生产线
├── file-viewer-main/                # 多格式文件预览
├── Hands-On-Large-Language-Models/  # LLM 书籍配套实战
├── hello-agents/                    # 智能体教程
├── image-copy/                      # 图像提示词分析工具
├── local-deep-research/             # 本地深度研究助手
├── loop-engineering/                # Agent 自动化工程引擎
├── lumenx/                          # AI 漫剧创作平台
├── Python-100-Days/                 # Python 全栈教程
├── PythonCrawler/                   # Python 爬虫示例集合
├── RuView/                          # WiFi 空间智能平台
├── skills/                          # 工程实践技能集
├── WeKnora/                         # 知识管理框架
├── yao-open-prompts/                # 提示词模板
├── zz-toolbox/                      # 桌面工具箱
└── README.md
```

---

## 项目分类总览

> **知识点列**：每个项目浓缩了 3‑8 个核心技术点，供横向对比学习。

### 📚 AI 与编程学习资料

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [ai-engineering-from-scratch](ai-engineering-from-scratch/) | 从基础到 AI 工程的系统课程 | Python, TypeScript, Rust, Julia | 数学与机器学习基础 · LLM 工程 · Agent 工程 · MCP 与 Agent Skills · 配套实践 |
| [Hands-On-Large-Language-Models](Hands-On-Large-Language-Models/) | 《Hands-On LLMs》配套代码，按章节组织的 Notebook 实战 | Python, PyTorch, Transformers | Token 与 Embedding · Transformer · 分类与生成 · 语义搜索/RAG · 多模态 · 微调 |
| [Python-100-Days](Python-100-Days/) | Python 全栈 100 天教程，包含数据分析与机器学习 | Python, Django, NumPy, Pandas | Python 基础 · Web 开发 · 爬虫 · 数据科学 · 经典机器学习 |
| [awesome-ai-apps](awesome-ai-apps/) | LLM 应用示例集合 | Python, LangChain, CrewAI, Streamlit | Agent 框架 · RAG · MCP · 语音 Agent · 多 Agent 应用 |
| [ai-agent-book](ai-agent-book/) | AI Agent 设计原理与配套项目 | Python, LangGraph, MCP, RAG | 上下文工程 · 记忆与知识库 · 工具系统 · Agent 评估 · 多 Agent 协作 |
| [ai-agents-the-definitive-guide](ai-agents-the-definitive-guide/) | AI Agent 专题书配套 Notebook | Python, Jupyter, LangGraph | Agent 架构 · 规划与工具 · 部署 · 评估 · 记忆与安全 |
| [agents-learn](agents-learn/) | AI Agent 技术栈学习计划及完整实践项目 | Python, LangGraph, FastAPI, Chroma | Prompt · Embedding/RAG · Agent 编排 · 记忆 · 评估与安全 |
| [hello-agents](hello-agents/) | Datawhale 中文智能体教程 | Python, LangGraph, AutoGen, MCP, A2A | Agent 范式与框架 · 上下文工程 · RAG · Agent 通信协议 |
| [AI技能整理](AI技能整理/) | AI 技能、页面生成和垂直领域 AI 应用学习资料 | — | 分类资料整理；目录暂无独立 README |
| [PythonCrawler](PythonCrawler/) | Python 爬虫技术示例集合 | Python, Requests, Selenium | 网页请求与解析 · 浏览器自动化 · 数据采集；学习时遵守网站条款与适用法律 |

### 🤖 Agent、技能工作流与提示词

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [agency-agents](agency-agents/) | 232 个 AI 代理人格库，跨 16 个专业领域 | Markdown Agent 定义，多 CLI 兼容 | Agent 人格设计方法论 · 13+ AI 编码平台兼容 · 16 部门分类法（工程/设计/营销/安全/金融等）· Runbook 风格 Agent 文件（身份/使命/规则/交付物/流程/指标）· 社区翻译生态（8+ 语言） |
| [agent-skills](agent-skills/) | Addy Osmani 生产级 Agent 技能集，24 个结构化工作流 | Markdown SKILL.md，斜杠命令系统 | 24 个结构化 Skill 映射开发生命周期 · 斜杠命令系统（/spec /plan /build /test /review /ship）· 反合理化表格防跳步 · 验证优先（测试/构建/运行时数据）· Google 工程文化原则 · Skill 解剖（frontmatter/流程/红旗/验证） |
| [skills](skills/) | Matt Pocock 实用工程技能集 | Markdown SKILL.md, 斜杠命令 | 需求访谈 · TDD · 架构改进 · 缺陷诊断 · 规约驱动开发 · 代码审查 |
| [claude-skills](claude-skills/) | Claude 开发流程与工程实践文档 | Markdown | API 设计 · 数据库迁移 · 前端开发 · 集成测试 · 单元测试 · 模块交付 |
| [yao-open-prompts](yao-open-prompts/) | 中文 AI 提示词模板，按场景分类整理 | Markdown, YAML frontmatter | 提示词结构 · 场景分类 · YAML 元数据 · GEO 与知识图文提示 |
| [loop-engineering](loop-engineering/) | 自动拾取任务、隔离执行并验证的 Agent 工程引擎 | Python, Bash, Git worktrees | 自动化循环 · 确定性门禁 · Git worktree 隔离 · 记忆持久化与调度 |

### 🧠 AI 数据、知识管理与研究

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [WeKnora](WeKnora/) | 腾讯开源知识管理框架，RAG + Agent + Auto-Wiki 三合一 | Python, Go, Docker, Langfuse | RAG + ReAct Agent + Wiki Mode · 多数据源（飞书/Notion/语雀/RSS）· 20+ 模型供应商（OpenAI/DeepSeek/Qwen/Gemini 等）· 模块化解耦架构（LLM/向量库/存储均可替换）· Langfuse 全链路可观测 · 企业级 RBAC + 审计日志 · 多 IM 集成（企微/飞书/Slack/Telegram） |
| [local-deep-research](local-deep-research/) | 本地化深度研究助手，多检索引擎 + 加密知识库 | Python, Ollama, LangChain, SQLCipher | LangGraph 自主 Agent 研究策略 · 多策略研究（快速摘要/深度研究/报告生成/文档分析）· SQLCipher AES-256 加密知识库 · 20+ 检索源（学术/通用/高级）· Journal 质量评分系统 · MCP 服务器集成 · Cosign 签名的 Docker 镜像 + SPDX SBOM |
| [aella-data-explorer](aella-data-explorer/) | 科学论文交互式探索，语义嵌入 + 降维 + 聚类 | React, TypeScript, D3.js, Python FastAPI | SPECTER2 语义嵌入（768 维）· UMAP 降维可视化 · K-Means 聚类 + Silhouette 优化 · TF-IDF + LLM 标签标注 · D3.js 交互式可视化 · FastAPI + SQLite 后端 |
| [Crucix](Crucix/) | 聚合多源公开数据的 OSINT 情报仪表盘，可选接入 LLM | Node.js, Express, JavaScript | 多源数据采集 · 实时仪表盘 · 跨源信号关联 · LLM 辅助分析 |

### 🎬 AI 媒体生成与创作

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [dramaclaw](dramaclaw/) | 小说到成片的短剧生产管线 | Python, Docker, OpenAI API | 剧本与分镜流程 · 资产管理 · 角色一致性 · 视频合成 |
| [lumenx](lumenx/) | AI 漫剧和视频创作平台，Studio + Playground | Python, Next.js, FastAPI, DashScope | 剧本分析 · 分镜与资产 · 多模式视频生成 · 智能配音 |
| [image-copy](image-copy/) | 浏览器扩展：分析网页图片并生成可编辑提示词 | Chrome MV3, Gemini, OpenAI API | 图片理解 · 提示词生成 · 多模型接入 · 浏览器扩展架构 |

### 📡 垂直领域 AI 与空间智能

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [RuView](RuView/) | WiFi CSI 空间智能平台，穿墙感知人体/呼吸/姿态 | Rust, Python, ESP32, Candle, SNN | CSI 信道状态信息提取（ESP32 穿墙感知）· 非接触式生命体征监测（呼吸 0.1–0.5Hz / 心率 0.8–2.0Hz）· 17 关键点 WiFi 姿态估计（对比学习 + SNN）· 自监督 CSI 嵌入（128 维）· 多频段 3 倍感知带宽 · 边缘智能 105 个 Cog 模块 · 智能家居集成（Home Assistant/Matter）· Ed25519 见证链完整性证明 |

### 🧰 内容平台与通用工具

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [creatorhub](creatorhub/) | 本地运行的多平台内容管理面板 | Python, FastAPI, Playwright | 多平台账号与内容管理 · 监控与发布 · 本地数据存储 |
| [file-viewer-main](file-viewer-main/) | 支持多种扩展名的前端文件预览组件 | TypeScript, Vue/React/Svelte, Three.js | 模块化渲染器 · 浏览器端解析 · Worker/WASM · 多框架适配 |
| [zz-toolbox](zz-toolbox/) | Electron/Vue 桌面工具集合 | JavaScript, Electron, Vite | 多项目桌面工具整合；项目说明待补充 |

---

## 技术栈分布

> 基于各项目 README 的综合统计

| 类别 | 大概数量 | 代表 |
|---|---|---|
| **Python** | ~10+ | 后端核心语言，FastAPI / Django / Flask |
| **TypeScript/JavaScript** | ~8 | dramaclaw, agent-skills, skills, file-viewer |
| **React / Next.js** | ~3 | aella-data-explorer, lumenx |
| **Vue** | ~3 | file-viewer, hello-agents |
| **Rust** | ~2 | RuView (Rust), voicebox (Tauri) |
| **Go** | ~1 | WeKnora |
| **Docker** | ~10+ | 大部分项目支持容器化部署 |
| **AI 供应商** | 多家 | DashScope, OpenAI, Claude, Gemini, DeepSeek, Qwen, MiniMax… |
| **硬件 / 嵌入式** | 少量 | RuView (ESP32 CSI), AI_DesktopCat (ESP32S3) |

---

## 使用建议

1. 进入具体子项目目录后，优先阅读该目录自己的 `README.md`。
2. 大部分项目来自上游开源仓库，每个子目录有独立的 `.git`；更新时进入对应子目录 `git pull`，再回到根目录提交。
3. 本地实验项目可直接在本仓库内维护，保留各自独立的依赖文件、运行说明和 `.env.example`。
4. 大模型权重、数据集、渲染产物、缓存、密钥和本地数据库不提交到根仓库。

---

## 维护规则

- 新增或删除根目录项目时，更新"最后更新"日期、项目总数量和对应分类列表。
- 新项目根据其功能放入对应分类；不确定时归入"工具集合"类。
- 根 `.gitignore` 只维护通用规则；子项目专属规则放在子项目自己的 `.gitignore` 中。
- 不要提交 `.env`、模型权重、临时输出、IDE 缓存、依赖安装目录和大型数据文件。
- 所有项目平铺在根目录，通过本 README 的分类索引组织。

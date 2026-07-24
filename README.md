# CodeCamp

个人 AI 学习项目集合。这个仓库用于集中索引、保存和实验多个 AI、Agent、RAG、视频生成、知识管理及工具类项目，方便横向学习、对比技术栈和沉淀本地实践。

> **最后更新：** 2026-07-24  
> **当前项目总数：** 22 个  
> **目录结构：** 扁平化根目录，按领域分类索引

---

## 项目识别

- **仓库定位**：个人学习型 monorepo / 项目索引仓库。
- **主要主题**：AI 视频生成、AI Agent、LLM 应用、知识管理、AI 语音、金融数据、空间智能、工具平台和学习资料。
- **组织方式**：所有项目平铺在根目录，本 README 按领域分类索引。各子项目保留自己的 README、依赖文件和运行方式。
- **维护重点**：新增或删除项目时，同步更新本 README 的分类列表。

---

## 目录结构

```
CodeCamp/
├── aella-data-explorer/        # 🔬 科学论文交互式探索
├── agency-agents/              # 🤖 232 个 AI 代理人格库
├── agent-skills/               # 🛠️ 24 个生产级 Agent 工作流
├── AI_DesktopCat_Qwen3.5Omni/  # 🐱 桌面机器猫
├── ai-agent-book/              # 📚 AI Agent 设计原理
├── AI技能整理/                   # 📋 AI 技能学习资料
├── awesome-ai-apps/            # 🌟 80+ LLM 应用示例
├── dramaclaw/                  # 🎬 工业化短剧生产线
├── file-viewer-main/           # 📂 纯前端文件预览
├── Hands-On-Large-Language-Models/  # 📖 Hands-On LLMs
├── hello-agents/               # 🤖 Datawhale 智能体教程
├── image-copy/                 # 🖼️ 图片逆向 Prompt
├── local-deep-research/        # 🔍 本地深度研究
├── loop-engineering/           # 🔄 Loop 自动化引擎
├── lumenx/                     # 🎬 AI 漫剧创作平台
├── Python-100-Days/            # 🐍 Python 全栈教程
├── RuView/                     # 📡 WiFi 空间智能平台
├── skills/                     # 🛠️ 工程技能集
├── voicebox/                   # 🎙️ AI 语音工作室
├── WeKnora/                    # 🧠 知识管理框架
├── yao-open-prompts/           # 📝 117+ 提示词模板
├── zz-toolbox/                 # 🧰 桌面工具箱
└── README.md
```

---

## 项目分类总览

> **知识点列**：每个项目浓缩了 3‑8 个核心技术点，供横向对比学习。

### 🎬 AI 视频 / 图像 / 媒体生成

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [dramaclaw](dramaclaw/) | 工业化短剧生产线，小说到成片全自动管线 | Python, Docker, OpenAI API | 工业化短剧生产管线 · 资产库与角色一致性 · Freezone 无限画布 · 3GS 场景世界模型 · Xia Director AI 导演助手 · SQLite + 文件系统本地存储 |
| [lumenx](lumenx/) | AI 漫剧和视频创作平台，Studio + Playground | Python, Next.js, FastAPI, DashScope | Pipeline 优先架构（剧本→分镜→资产→视频→合成→导出）· LLM 深度剧本分析 · 模型目录架构（YAML 定义 → JSON 编译）· 多模式视频生成（I2V/R2V/批量化）· CosyVoice + Qwen3-TTS 智能配音 |
| [AI_DesktopCat_Qwen3.5Omni](AI_DesktopCat_Qwen3.5Omni/) | 桌面机器猫，ESP32 硬件 + AI 对话 + 表情/动作 | ESP32, Arduino, Python, DashScope | 嵌入式 IoT 硬件集成（ESP32S3/ST7789/PCA9685）· 多舵机控制（PWM + 总线舵机）· 实时摄像头 WebSocket 推流 · ASR + AI 对话 + 语音合成管线 · LittleFS 表情动画存储 · 3D 打印机械结构 |

### 🤖 AI Agent 与技能框架

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [agency-agents](agency-agents/) | 232 个 AI 代理人格库，跨 16 个专业领域 | Markdown Agent 定义，多 CLI 兼容 | Agent 人格设计方法论 · 13+ AI 编码平台兼容 · 16 部门分类法（工程/设计/营销/安全/金融等）· Runbook 风格 Agent 文件（身份/使命/规则/交付物/流程/指标）· 社区翻译生态（8+ 语言） |
| [agent-skills](agent-skills/) | Addy Osmani 生产级 Agent 技能集，24 个结构化工作流 | Markdown SKILL.md，斜杠命令系统 | 24 个结构化 Skill 映射开发生命周期 · 斜杠命令系统（/spec /plan /build /test /review /ship）· 反合理化表格防跳步 · 验证优先（测试/构建/运行时数据）· Google 工程文化原则 · Skill 解剖（frontmatter/流程/红旗/验证） |
| [hello-agents](hello-agents/) | Datawhale 中文智能体教程，概念到实战全覆盖 | Python, LangGraph, AutoGen, MCP, A2A | 完整 Agent 学习路径（基础→经典范式→低代码→框架→自建框架）· 经典范式实现（ReAct/Plan-and-Solve/Reflection）· 上下文工程 + 记忆系统 + RAG · Agent 通信协议（MCP/A2A/ANP）· Agentic RL 训练管线（SFT→GRPO） |

### 🔧 AI 工具与平台

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [WeKnora](WeKnora/) | 腾讯开源知识管理框架，RAG + Agent + Auto-Wiki 三合一 | Python, Go, Docker, Langfuse | RAG + ReAct Agent + Wiki Mode · 多数据源（飞书/Notion/语雀/RSS）· 20+ 模型供应商（OpenAI/DeepSeek/Qwen/Gemini 等）· 模块化解耦架构（LLM/向量库/存储均可替换）· Langfuse 全链路可观测 · 企业级 RBAC + 审计日志 · 多 IM 集成（企微/飞书/Slack/Telegram） |
| [local-deep-research](local-deep-research/) | 本地化深度研究助手，多检索引擎 + 加密知识库 | Python, Ollama, LangChain, SQLCipher | LangGraph 自主 Agent 研究策略 · 多策略研究（快速摘要/深度研究/报告生成/文档分析）· SQLCipher AES-256 加密知识库 · 20+ 检索源（学术/通用/高级）· Journal 质量评分系统 · MCP 服务器集成 · Cosign 签名的 Docker 镜像 + SPDX SBOM |
| [loop-engineering](loop-engineering/) | Loop 工程自动化引擎，从收件箱拾取任务自主执行 | Python, Bash, Git worktrees | Loop Engineering 范式（取代人类 Prompt 者）· 五大动作（发现/交接/草稿/评估/持久化）· 八大确定性门禁 · Git worktree 任务隔离 · Agnes AI 集成 · 追加式记忆系统 · Cron 定时调度 |
| [aella-data-explorer](aella-data-explorer/) | 科学论文交互式探索，语义嵌入 + 降维 + 聚类 | React, TypeScript, D3.js, Python FastAPI | SPECTER2 语义嵌入（768 维）· UMAP 降维可视化 · K-Means 聚类 + Silhouette 优化 · TF-IDF + LLM 标签标注 · D3.js 交互式可视化 · FastAPI + SQLite 后端 |

### 🎙️ AI 语音

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [voicebox](voicebox/) | 开源 AI 语音工作室，7 种 TTS 引擎、声音克隆、MCP 输出 | Rust (Tauri), Python, React, MLX, MCP | 7 种 TTS 引擎集成（Qwen3/Chatterbox/Kokoro 等）· 零样本声音克隆 · 完整语音 I/O 环（Whisper STT → 多引擎 TTS → LLM 精修）· MCP 服务器为 Agent 提供语音 · Tauri 原生桌面（GPU 加速 Metal/CUDA/ROCm/DirectML）· 后处理效果链（pedalboard）· 全局热键听写 |

### 🧩 工具集合 / 金融 / 游戏

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [file-viewer-main](file-viewer-main/) | 纯前端文件预览组件，支持 206 种扩展名 | TypeScript, Vue/React/Svelte, Three.js | 模块化渲染器架构（核心 + 独立渲染器 + 预设 + 框架组件）· 纯浏览器端解析（无需服务端转码）· 24 条预览管线 · 多框架支持（Vue 2/3/React/Svelte/jQuery/Web Components）· 按需懒加载 · Worker/WASM 解析 · 50+ npm 包分发 |
| [image-copy](image-copy/) | Chrome 扩展：网页图片反推可编辑提示词 | Chrome MV3, Gemini, OpenAI API | Chrome Extension MV3 架构（background/content script/options）· 多提供商图像分析 + 生成 · 浏览器层图片覆盖注入 + 浮动操作按钮 · 客户端 API Key 存储（chrome.storage.local BYOK）· 完整闭环：识别→编辑→再生成 |
| [zz-toolbox](zz-toolbox/) | 中造工具箱，多项目整合的 Electron/Vue 桌面工具集 | JavaScript, Electron, Vite | 待完善/无 README |

### 📡 空间智能

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [RuView](RuView/) | WiFi CSI 空间智能平台，穿墙感知人体/呼吸/姿态 | Rust, Python, ESP32, Candle, SNN | CSI 信道状态信息提取（ESP32 穿墙感知）· 非接触式生命体征监测（呼吸 0.1–0.5Hz / 心率 0.8–2.0Hz）· 17 关键点 WiFi 姿态估计（对比学习 + SNN）· 自监督 CSI 嵌入（128 维）· 多频段 3 倍感知带宽 · 边缘智能 105 个 Cog 模块 · 智能家居集成（Home Assistant/Matter）· Ed25519 见证链完整性证明 |

### 📚 学习资料与教程

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [Hands-On-Large-Language-Models](Hands-On-Large-Language-Models/) | 《Hands-On LLMs》配套代码，12 章 Jupyter 实战 | Python, PyTorch, Transformers | 完整 LLM 学习谱系（Token/Embedding → Transformer → 分类 → 聚类 → Prompt → 高级生成 → 语义搜索/RAG → 多模态 → 微调）· 文本分类与主题建模 · 嵌入模型创建与微调 · BERT 式 + 生成式模型微调 · Google Colab T4 GPU 实践 |
| [Python-100-Days](Python-100-Days/) | Python 全栈 100 天教程（Web/数据分析/AI） | Python, Django, NumPy, Pandas | 30 天 Python 基础（数据类型/控制流/函数/OOP/IO/正则）· MySQL 数据库（DDL/DML/DQL/DCL）+ Hive · Django Web 框架全栈 · 爬虫（requests/BS/Selenium/Scrapy）· 数据科学（NumPy/Pandas/Matplotlib/Seaborn）· 机器学习经典算法 · DevOps（Docker/Nginx/uWSGI/CI/CD） |
| [awesome-ai-apps](awesome-ai-apps/) | 80+ 个 LLM 应用示例（Agents/RAG/MCP/微调） | Python, LangChain, CrewAI, Streamlit | 14+ AI Agent 框架实战（LangChain/LangGraph/CrewAI/AutoGen/LlamaIndex/Mastra/DSPy）· 语音 Agent 管线（LiveKit/Pipecat/Deepgram/ElevenLabs）· MCP 服务端/客户端实现 · RAG 应用（Agentic RAG/混合搜索/PDF 分析/代码感知 RAG）· 多 Agent 生产管线 |
| [ai-agent-book](ai-agent-book/) | AI Agent 设计原理 10 章 + 88 个配套项目 | Python, LangGraph, MCP, RAG | 核心公式 Agent = LLM + 上下文 + 工具 · 上下文工程（KV Cache/Prompt/Skills/压缩）· 用户记忆 + 知识库（RAG/知识图谱）· 工具系统（MCP 协议/三类工具/事件驱动）· Coding Agent · Agent 评估 · 模型后训练（SFT/RL Tradeoff）· 多 Agent 协作（群体智能/涌现 Agent 社会） |
| [yao-open-prompts](yao-open-prompts/) | 117+ 中文 AI 提示词模板，按场景分类整理 | Markdown, YAML frontmatter | RTF 元提示系统（需求/任务架构/格式规范）· 9 大类 117 条提示词 · 统一 YAML frontmatter 规格 · GEO（生成引擎优化）营销提示 · 宽幅知识信息图提示 · 版本化持续更新机制 |
| [skills](skills/) | Matt Pocock 实用工程技能，专注真实工程实践而非 Vibe Coding | Markdown SKILL.md, 斜杠命令 | "烤问"方法论（结构化访谈对齐 Agent 理解）· 共享语言/领域模型 · TDD 红线-绿线-重构 · 代码库架构持续改进 · 规约驱动开发 · 缺陷诊断（复现→最小化循环）· 双轴代码审查（标准合规 + 规约忠实度）· 真实工程学科 |
| [AI技能整理](AI技能整理/) | AI 技能、页面生成、垂直领域 AI 应用等学习资料 | — | 待完善/无 README |

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

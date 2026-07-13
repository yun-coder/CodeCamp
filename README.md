# CodeCamp

个人 AI 学习项目集合。这个仓库用于集中索引、保存和实验多个 AI、Agent、RAG、视频生成、金融数据、工具平台类项目，方便横向学习、对比技术栈和沉淀本地实践。

> **最后更新：** 2026-07-13  
> **当前项目总数：** 45 个（37 个有效项目 + 8 个计划/空目录）  
> **目录结构：** 8 个分类文件夹，扁平化索引

---

## 项目识别

- **仓库定位**：个人学习型 monorepo / 项目索引仓库。
- **主要主题**：AI 视频生成、AI Agent、LLM 应用、多模态、语音合成、AI 网关、金融数据、工具平台和学习资料。
- **组织方式**：根目录按领域分类为 8 个文件夹，各子项目保留自己的 README、依赖文件和运行方式。
- **维护重点**：新增或删除项目时，同步更新对应分类下的列表。

---

## 目录结构

```
CodeCamp/
├── video-media-gen/    # 🎬 AI 视频/图像/媒体生成（11 个）
├── ai-agent/           # 🤖 AI Agent 与技能框架（7 个）
├── ai-tools/           # 🔧 AI 工具与平台（6 个）
├── ai-voice/           # 🎙️ AI 语音（1 个）
├── utility/            # 🧩 工具集合/金融/游戏（7 个）
├── learning/           # 📚 学习资料与教程（5 个）
├── spatial/            # 📡 空间智能（1 个）
├── planned/            # 📋 计划/空目录（7 个）
└── README.md
```

---

## 项目分类总览

### 🎬 video-media-gen/ — AI 视频 / 图像 / 媒体生成

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [ArcReel](video-media-gen/ArcReel/) | 小说转短视频全流程 AI 视频生成平台，多智能体编排 | FastAPI, React, Claude Agent SDK, 多 AI 供应商 |
| [OpenMontage](video-media-gen/OpenMontage/) | 开源 Agent 化视频制作系统，12 条制作流水线，400+ Agent 技能 | Python, Remotion, 多视频/图像供应商 |
| [Toonflow-app](video-media-gen/Toonflow-app/) | AI 短剧工厂，三层 Agent 协作、章节事件图谱、持久化记忆 | TypeScript, Express 5, Vercel AI SDK, ONNX |
| [ai_story](video-media-gen/ai_story/) | AI 故事视频自动化平台，Pipeline 责任链模式 | Python/Django, Celery, Vue, 多 AI 服务 |
| [lumenx](video-media-gen/lumenx/) | 阿里巴巴 AI 漫剧和视频创作平台，Studio + Playground | Python, Next.js, FastAPI, DashScope |
| [yunspire](video-media-gen/yunspire/) | AI 漫剧创作平台（lumenx 衍生版）| Python, Next.js, FastAPI, DashScope |
| [MoneyPrinterTurbo](video-media-gen/MoneyPrinterTurbo/) | AI 短视频生成工具，自动脚本/配音/字幕/合成 | Python, Streamlit, FFmpeg, Pexels API |
| [huobao-drama](video-media-gen/huobao-drama/) | AI 短剧生成平台，Mastra AI Agent 驱动的全自动化 | TypeScript, Hono, Nuxt 3, Mastra AI |
| [OpenMAIC](video-media-gen/OpenMAIC/) | 清华多代理互动课堂，AI 教师+同学沉浸学习（PPT/视频生成） | Next.js 16, TypeScript, LangGraph |
| [moirai_studio](video-media-gen/moirai_studio/) | 像素级图片理解与编辑引擎，VLM 规划 + AI 模型执行 | Python, SAM, MiniMax VL, PaddleOCR |
| [AI_DesktopCat_Qwen3.5Omni](video-media-gen/AI_DesktopCat_Qwen3.5Omni/) | 桌面机器猫，ESP32 硬件 + AI 对话 + 表情/动作交互 | ESP32, Arduino, Python, DashScope |

### 🤖 ai-agent/ — AI Agent 与技能框架

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [Agent-Reach](ai-agent/Agent-Reach/) | AI Agent 上网能力层，一键聚合互联网工具 | Python, yt-dlp, MCP, 多平台 CLI |
| [agency-agents](ai-agent/agency-agents/) | 232 个 AI 代理人格库，跨 16 个专业领域 | Markdown Agent 定义，多 CLI 兼容 |
| [agent-skills](ai-agent/agent-skills/) | Addy Osmani 生产级 Agent 技能集，24 个结构化工作流 | Markdown SKILL.md，斜杠命令系统 |
| [chubbyskills](ai-agent/chubbyskills/) | 信息采集与第二大脑技能集（抖音/B站/小红书等） | Python, SenseVoice, DeepSeek, Obsidian |
| [council-of-high-intelligence](ai-agent/council-of-high-intelligence/) | 18 个历史人物 AI 角色多供应商审议系统 | 多 LLM 路由（Claude/OpenAI/Gemini/…）|
| [hello-agents](ai-agent/hello-agents/) | Datawhale 中文智能体教程，从概念到实战全覆盖 | Python, LangGraph, AutoGen, MCP, A2A |
| [intentos](ai-agent/intentos/) | 意图驱动 OS 演示，AI 优先的连续画布设计 | Python, Autogen, FastAPI, MiniMax-M3 |

### 🔧 ai-tools/ — AI 工具与平台

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [OmniRoute](ai-tools/OmniRoute/) | 免费 AI 网关，连接 237 家供应商（90+ 免费层）| TypeScript, Next.js 16, MCP/A2A, SQLite |
| [local-deep-research](ai-tools/local-deep-research/) | 本地化深度研究助手，多检索引擎 + 加密知识库 | Python, Ollama, LangChain, SQLCipher |
| [project-helper](ai-tools/project-helper/) | GitHub 仓库学习助手，自动生成源码报告 | Python, FastAPI, DeepSeek, Vue |
| [loop-engineering](ai-tools/loop-engineering/) | Loop 工程自动化引擎，自动从收件箱拾取任务，git worktree 隔离执行 | Python, Bash, Git worktrees |
| [career-ops](ai-tools/career-ops/) | AI 驱动的求职/Offer 管理系统（职位评估、简历生成） | Node.js, Playwright, Go |
| [aella-data-explorer](ai-tools/aella-data-explorer/) | 科学论文交互式探索应用，语义嵌入 + 降维 + 聚类可视化 | React, TypeScript, D3.js, Python FastAPI |

### 🎙️ ai-voice/ — AI 语音

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [voicebox](ai-voice/voicebox/) | 开源 AI 语音工作室，7 种 TTS 引擎、声音克隆、MCP 输出 | Rust (Tauri), Python, React, MLX, MCP |

### 🧩 utility/ — 工具集合 / 金融 / 游戏

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [OpenBB](utility/OpenBB/) | 开源金融数据平台与研究工具，集成多种数据源 | Python, FastAPI, PostgreSQL, Docker |
| [ai-website-cloner-template](utility/ai-website-cloner-template/) | 网站克隆模板，AI Agent 逆向工程任意网站为 Next.js | Next.js 16, React 19, shadcn/ui |
| [image-copy](utility/image-copy/) | Chrome 扩展：网页图片反推可编辑提示词 | Chrome MV3, Gemini, OpenAI API |
| [file-viewer-main](utility/file-viewer-main/) | 纯前端文件预览组件，支持 206 种扩展名 | TypeScript, Vue/React/Svelte, Three.js |
| [html-ppt-skill](utility/html-ppt-skill/) | HTML 演示文稿生成技能，36 主题 + 47 种动画 | HTML/CSS/JS，零构建步骤 |
| [super-space](utility/super-space/) | 3D 开放世界冒险游戏，程序化地形 + NPC 对话 | TypeScript, Three.js, React 19 |
| [zz-toolbox](utility/zz-toolbox/) | 中造工具箱，多项目整合的 Electron/Vue 桌面工具集 | JavaScript, Electron, Vite |

### 📡 spatial/ — 空间智能

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [RuView](spatial/RuView/) | WiFi CSI 空间智能平台，穿墙感知人体/呼吸/姿态 | Rust, Python, ESP32, Candle, SNN |

### 📚 learning/ — 学习资料与教程

| 项目 | 简介 | 技术栈 |
|---|---|---|
| [Hands-On-Large-Language-Models](learning/Hands-On-Large-Language-Models/) | 《Hands-On LLMs》配套代码，12 章 Jupyter 实战 | Python, PyTorch, Transformers |
| [Python-100-Days](learning/Python-100-Days/) | Python 全栈 100 天教程（Web/数据分析/AI） | Python, Django, NumPy, Pandas |
| [awesome-ai-apps](learning/awesome-ai-apps/) | 80+ 个 LLM 应用示例（Agents/RAG/MCP/微调） | Python, LangChain, CrewAI, Streamlit |
| [yao-open-prompts](learning/yao-open-prompts/) | 117+ 中文 AI 提示词模板，按场景分类整理 | Markdown, YAML frontmatter |
| [AI技能整理](learning/AI技能整理/) | AI 技能、页面生成、垂直领域 AI 应用等学习资料 | — |

### 📋 planned/ — 计划 / 空目录

| 项目 | 预期方向 |
|---|---|
| [BuildingAI](planned/BuildingAI/) | Building AI 全栈平台，支持博客、知识库、AI 对话等 |
| [fpv-immersive-video-prompting](planned/fpv-immersive-video-prompting/) | FPV 运镜导演 AgentSkill |
| [Horizon](planned/Horizon/) | 新闻资讯聚合与阅读平台 |
| [html-video](planned/html-video/) | HTML 转视频工具 |
| [IDM-VTON](planned/IDM-VTON/) | 图像驱动虚拟试穿模型 |
| [mmdetection3d](planned/mmdetection3d/) | OpenMMLab 3D 目标检测工具箱 |
| [JoyAI-Echo](ai-voice/JoyAI-Echo/) | AI 语音交互实验项目 |

---

## 技术栈分布

> 基于各项目 README 的综合统计

| 类别 | 大概数量 | 代表 |
|---|---|---|
| **Python** | ~25+ | 后端核心语言，FastAPI / Django / Flask |
| **TypeScript/JavaScript** | ~12 | ArcReel, OmniRoute, Toonflow, agent-skills |
| **React / Next.js** | ~8 | ArcReel, OmniRoute, OpenMAIC, ai-website-cloner |
| **Vue** | ~4 | huobao-drama, ai_story, file-viewer |
| **Docker** | ~15+ | 大部分项目支持容器化部署 |
| **AI 供应商** | 多家 | DashScope, OpenAI, Claude, Gemini, MiniMax, Kling, Vidu, Grok, FLUX… |
| **硬件 / Rust** | 少量 | RuView (Rust), AI_DesktopCat (ESP32) |

---

## 使用建议

1. 进入具体子项目目录后，优先阅读该目录自己的 `README.md`。
2. 大部分项目来自上游开源仓库，每个子目录有独立的 `.git`；更新时进入对应子目录 `git pull`，再回到根目录提交。
3. 本地实验项目可直接在本仓库内维护，保留各自独立的依赖文件、运行说明和 `.env.example`。
4. 大模型权重、数据集、渲染产物、缓存、密钥和本地数据库不提交到根仓库。

---

## 维护规则

- 新增或删除根目录项目时，更新"最后更新"日期、项目总数量和对应分类列表。
- 新项目根据其功能放入对应分类文件夹；不确定时放 `utility/`。
- 根 `.gitignore` 只维护通用规则；子项目专属规则放在子项目自己的 `.gitignore` 中。
- 不要提交 `.env`、模型权重、临时输出、IDE 缓存、依赖安装目录和大型数据文件。
- `planned/` 中的空目录表明有意图但尚未填充内容；填充后移至对应分类。

# CodeCamp

个人 AI 学习项目集合。这个仓库用于集中索引、保存和实验多个 AI、Agent、RAG、视频生成、金融数据、工具平台类项目，方便横向学习、对比技术栈和沉淀本地实践。

> **最后更新：** 2026-07-21  
> **当前项目总数：** 49 个（40 个完整项目 + 3 个待完善 + 6 个计划/空目录）  
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
├── video-media-gen/    # 🎬 AI 视频/图像/媒体生成（13 个）
├── ai-agent/           # 🤖 AI Agent 与技能框架（7 个）
├── ai-tools/           # 🔧 AI 工具与平台（6 个）
├── ai-voice/           # 🎙️ AI 语音（2 个）
├── utility/            # 🧩 工具集合/金融/游戏（7 个）
├── learning/           # 📚 学习资料与教程（7 个）
├── spatial/            # 📡 空间智能（1 个）
├── planned/            # 📋 计划/空目录（6 个）
└── README.md
```

---

## 项目分类总览

> **知识点列**：每个项目浓缩了 3‑8 个核心技术点，供横向对比学习。

### 🎬 video-media-gen/ — AI 视频 / 图像 / 媒体生成

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [ArcReel](video-media-gen/ArcReel/) | 小说转短视频全流程 AI 视频生成平台，多智能体编排 | FastAPI, React, Claude Agent SDK, 多 AI 供应商 | 多 Agent 编排（Orchestration Skill + Subagent）· 沙箱 Agent 运行时（bwrap）· 抽象 Backend 模式（Image/Video/Text）· 异步任务队列 + RPM 限流 · 角色一致性系统 · 剪映草稿导出 |
| [OpenMontage](video-media-gen/OpenMontage/) | 开源 Agent 化视频制作系统，12 条制作流水线 | Python, Remotion, 多视频/图像供应商 | Agent 优先架构（AI 编程助手即编排者）· 12 条 Pipeline 生产线 · 3 层知识架构（工具/技能/知识包）· 评分制供应商选择引擎 · 质量门禁（预验证/自评/风险评分）· Remotion + HyperFrames + FFmpeg 三引擎合成 |
| [Toonflow-app](video-media-gen/Toonflow-app/) | AI 短剧工厂，三层 Agent 协作、章节事件图谱 | TypeScript, Express 5, Vercel AI SDK, ONNX | 三层 Agent 协作（决策/执行/监督）· 无限画布创作工作台 · 章节事件图谱驱动改编 · ONNX 本地向量持久记忆 · 可编程 Provider 系统（运行时编辑 TS 逻辑）· Skill 文件化 Prompt 配置 |
| [ai_story](video-media-gen/ai_story/) | AI 故事视频自动化平台，Pipeline 责任链模式 | Python/Django, Celery, Vue, 多 AI 服务 | 责任链 Pipeline 架构 · Celery 异步任务队列 · 智能运镜规划（推拉摇移）· 多模型负载均衡（加权/轮询/最闲）· 自动 Storyboard 生成 · 补偿机制（自动重试/故障转移） |
| [lumenx](video-media-gen/lumenx/) | 阿里巴巴 AI 漫剧和视频创作平台，Studio + Playground | Python, Next.js, FastAPI, DashScope | Pipeline 优先架构（剧本→分镜→资产→视频→合成→导出）· LLM 深度剧本分析 · 模型目录架构（YAML 定义 → JSON 编译）· 多模式视频生成（I2V/R2V/批量化）· CosyVoice + Qwen3-TTS 智能配音 |
| [yunspire](video-media-gen/yunspire/) | AI 漫剧创作平台（lumenx 衍生版） | Python, Next.js, FastAPI, DashScope | 同 LumenX 架构 · 模型目录 + YAML 配置 · PyInstaller 桌面打包 + pywebview · 多厂商模型适配器（Wan/Kling/Vidu）· OSS 云媒体镜像 + 签名 URL |
| [MoneyPrinterTurbo](video-media-gen/MoneyPrinterTurbo/) | AI 短视频生成工具，自动脚本/配音/字幕/合成 | Python, Streamlit, FFmpeg, Pexels API | MVC 架构（API + Web UI）· 多提供商 LLM 集成（15+）· Edge TTS 时间戳对齐字幕 · faster-whisper 本地转录 · moviepy 视频合成 · 批量视频生成 |
| [huobao-drama](video-media-gen/huobao-drama/) | AI 短剧生成平台，Mastra AI Agent 驱动 | TypeScript, Hono, Nuxt 3, Mastra AI | Mastra AI 多 Agent 框架（5 个专业化 Agent）· 全自动短剧生产管线（剧本→角色→分镜→视频→配音→合成）· 多厂商媒体适配器模式 · FFmpeg 单镜合成 + 剧集拼接 · Grid 图像生成/拆分/重组 · 运行时 Skill 加载 |
| [OpenMAIC](video-media-gen/OpenMAIC/) | 清华多代理互动课堂，AI 教师+同学沉浸学习 | Next.js 16, TypeScript, LangGraph | LangGraph 多 Agent 编排（AI 教师/同学）· 两阶段生成管线（大纲→场景）· SSE 流式实时交互 · 28+ 动作执行引擎（板书/聚光灯/激光笔等）· Playback 状态机 · TTS + ASR 多提供商抽象 |
| [moirai_studio](video-media-gen/moirai_studio/) | 像素级图片理解与编辑引擎，VLM 规划 + AI 执行 | Python, SAM, MiniMax VL, PaddleOCR | SAM 语义分割图层分解 · SCHP 人体解析（20 类 LIP 标签）· VLM 规划编辑方案 · Provider 插件架构（OCR/视觉/分割/修复）· OpenCV 凸包修复 + AI 生成式修补 |
| [AI_DesktopCat_Qwen3.5Omni](video-media-gen/AI_DesktopCat_Qwen3.5Omni/) | 桌面机器猫，ESP32 硬件 + AI 对话 + 表情/动作 | ESP32, Arduino, Python, DashScope | 嵌入式 IoT 硬件集成（ESP32S3/ST7789/PCA9685）· 多舵机控制（PWM + 总线舵机）· 实时摄像头 WebSocket 推流 · ASR + AI 对话 + 语音合成管线 · LittleFS 表情动画存储 · 3D 打印机械结构 |
| [OpenCut](video-media-gen/OpenCut/) | 开源跨平台视频编辑器，Rust 核心重写 | Rust, Svelte, TypeScript | 多平台共享 Rust 核心 · 插件优先架构 · MCP 服务器（AI Agent 驱动剪辑）· Headless 自动化渲染 · Editor API 设计 · 内建脚本 Tab |
| [video-use](video-media-gen/video-use/) | Claude Code 原生视频编辑，自然语言操控 | TypeScript, Remotion, FFmpeg | LLM 不动原片（只读转录 + 视觉合成图）· 双层理解（始终加载音频转录 + 按需视觉 PNG）· 自评循环（检查跳帧/爆音/字幕）· 管线：转录→打包→推理→EDL→渲染→自评 · HyperFrames/Remotion/Manim 动画叠加 |

### 🤖 ai-agent/ — AI Agent 与技能框架

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [Agent-Reach](ai-agent/Agent-Reach/) | AI Agent 上网能力层，一键聚合互联网工具 | Python, yt-dlp, MCP, 多平台 CLI | 能力层设计模式（选择/安装/健康检查/路由）· 多后端路由 + 有序回退 · MCP 搜索集成（Exa）· 平台特定访问模式（Cookie/CLI/API）· 零配置通道 vs 凭据通道 · Cookie 安全模型（本地专用/专用账户） |
| [agency-agents](ai-agent/agency-agents/) | 232 个 AI 代理人格库，跨 16 个专业领域 | Markdown Agent 定义，多 CLI 兼容 | Agent 人格设计方法论 · 13+ AI 编码平台兼容 · 16 部门分类法（工程/设计/营销/安全/金融等）· Runbook 风格 Agent 文件（身份/使命/规则/交付物/流程/指标）· 社区翻译生态（8+ 语言） |
| [agent-skills](ai-agent/agent-skills/) | Addy Osmani 生产级 Agent 技能集，24 个结构化工作流 | Markdown SKILL.md，斜杠命令系统 | 24 个结构化 Skill 映射开发生命周期 · 斜杠命令系统（/spec /plan /build /test /review /ship）· 反合理化表格防跳步 · 验证优先（测试/构建/运行时数据）· Google 工程文化原则 · Skill 解剖（frontmatter/流程/红旗/验证） |
| [chubbyskills](ai-agent/chubbyskills/) | 信息采集与第二大脑技能集（抖音/B站/小红书等） | Python, SenseVoice, DeepSeek, Obsidian | 多平台内容采集 Skill · 统一 frontmatter 约定 · 离线语音转文字（SenseVoice + faster-whisper）· 内容富化管线（摘要/关键词/标签/价值评估）· 知识库三阶架构（素材/维基/输出）· 行业情报雷达 |
| [council-of-high-intelligence](ai-agent/council-of-high-intelligence/) | 18 个历史人物 AI 角色多供应商审议系统 | 多 LLM 路由（Claude/OpenAI/Gemini/…） | 多供应商自动路由（推理多样性）· 结构化审议协议（重新表述→独立分析→交叉质询→表决→综合）· 反群体思维机制（异议配额/新颖性门控/反事实提示）· 三种审议模式 · 加权 2/3 多数裁决 |
| [hello-agents](ai-agent/hello-agents/) | Datawhale 中文智能体教程，概念到实战全覆盖 | Python, LangGraph, AutoGen, MCP, A2A | 完整 Agent 学习路径（基础→经典范式→低代码→框架→自建框架）· 经典范式实现（ReAct/Plan-and-Solve/Reflection）· 上下文工程 + 记忆系统 + RAG · Agent 通信协议（MCP/A2A/ANP）· Agentic RL 训练管线（SFT→GRPO） |
| [intentos](ai-agent/intentos/) | 意图驱动 OS 演示，AI 优先的连续画布设计 | Python, Autogen, FastAPI, MiniMax-M3 | 意图优先 OS 范式（连续画布 vs 多窗口）· AutoGen 0.4 多 Agent 框架 · SSE 流式响应 · 分层设计（LLM 处理自然语言 + 关键词路由精确场景）· "Print + Terminal" 双层面美学 · 状态机前端 + 纯 HTML/JS/CSS |

### 🔧 ai-tools/ — AI 工具与平台

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [OmniRoute](ai-tools/OmniRoute/) | 免费 AI 网关，237 家供应商（90+ 免费层） | TypeScript, Next.js 16, MCP/A2A, SQLite | 17 种路由策略（优先级/成本优化/加权/轮询/融合等）· 10 引擎 Token 压缩管线 · 4 层自动回退（订阅→Key→廉价→免费）· 多平台部署（npm/Docker/Electron/Termux/PWA）· MCP + A2A 协议支持 · 断路器/冷却/模型锁定弹性层 |
| [local-deep-research](ai-tools/local-deep-research/) | 本地化深度研究助手，多检索引擎 + 加密知识库 | Python, Ollama, LangChain, SQLCipher | LangGraph 自主 Agent 研究策略 · 多策略研究（快速摘要/深度研究/报告生成/文档分析）· SQLCipher AES-256 加密知识库 · 20+ 检索源（学术/通用/高级）· Journal 质量评分系统（21 万+ 来源）· MCP 服务器集成 · Cosign 签名的 Docker 镜像 + SPDX SBOM |
| [project-helper](ai-tools/project-helper/) | GitHub 仓库学习助手，自动生成源码报告 | Python, FastAPI, DeepSeek, Vue | 自动 Clone/扫描/缓存仓库代码 · FastAPI 流式响应 Q&A · 本地静态分析回退 · DeepSeek API 代码理解 · 后端（Python/FastAPI）+ 前端（Vite/React） |
| [loop-engineering](ai-tools/loop-engineering/) | Loop 工程自动化引擎，从收件箱拾取任务自主执行 | Python, Bash, Git worktrees | Loop Engineering 范式（取代人类 Prompt 者）· 五大动作（发现/交接/草稿/评估/持久化）· 八大确定性门禁 · Git worktree 任务隔离 · Agnes AI 集成 · 追加式记忆系统 · Cron 定时调度 |
| [career-ops](ai-tools/career-ops/) | AI 求职/Offer 管理系统（职位评估、简历生成） | Node.js, Playwright, Go | AI 求职管线 · A-F 评分（10 个加权维度）· 15 个斜杠命令 · Playwright 门户扫描 · ATS 优化 PDF 简历 + 关键词注入 · Go + Bubble Tea TUI 仪表盘 · 面试故事库（STAR+反思）· 人在回路设计 |
| [aella-data-explorer](ai-tools/aella-data-explorer/) | 科学论文交互式探索，语义嵌入 + 降维 + 聚类 | React, TypeScript, D3.js, Python FastAPI | SPECTER2 语义嵌入（768 维）· UMAP 降维可视化 · K-Means 聚类 + Silhouette 优化 · TF-IDF + LLM 标签标注 · D3.js 交互式可视化 · FastAPI + SQLite 后端 |

### 🎙️ ai-voice/ — AI 语音

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [voicebox](ai-voice/voicebox/) | 开源 AI 语音工作室，7 种 TTS 引擎、声音克隆、MCP 输出 | Rust (Tauri), Python, React, MLX, MCP | 7 种 TTS 引擎集成（Qwen3/Chatterbox/Kokoro 等）· 零样本声音克隆 · 完整语音 I/O 环（Whisper STT → 多引擎 TTS → LLM 精修）· MCP 服务器为 Agent 提供语音 · Tauri 原生桌面（GPU 加速 Metal/CUDA/ROCm/DirectML）· 后处理效果链（pedalboard）· 全局热键听写 |
| [JoyAI-Echo](ai-voice/JoyAI-Echo/) | AI 语音交互实验项目 | — | 待完善/无 README |

### 🧩 utility/ — 工具集合 / 金融 / 游戏

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [OpenBB](utility/OpenBB/) | 开源金融数据平台，集成多种数据源 | Python, FastAPI, PostgreSQL, Docker | "一次连接，随处使用"架构 · Python SDK + Excel/REST API/MCP 多下游 · 企业工作区（可视化/AI Agent/协作分析）· 综合金融数据模块（股票/期权/债券/外汇/ETF/经济指标）· CLI 命令行访问 |
| [ai-website-cloner-template](utility/ai-website-cloner-template/) | 网站克隆模板，AI Agent 逆向工程任意网站为 Next.js | Next.js 16, React 19, shadcn/ui | 多阶段克隆管线（侦察→基础→组件规格→并行构建→组装）· AI Agent 代码逆向工程 · computed CSS 像素级提取 · 设计 Token 抽取（getComputedStyle）· Git worktree 并行构建 · 多 Agent 平台兼容 |
| [image-copy](utility/image-copy/) | Chrome 扩展：网页图片反推可编辑提示词 | Chrome MV3, Gemini, OpenAI API | Chrome Extension MV3 架构（background/content script/options）· 多提供商图像分析 + 生成 · 浏览器层图片覆盖注入 + 浮动操作按钮 · 客户端 API Key 存储（chrome.storage.local BYOK）· 完整闭环：识别→编辑→再生成 |
| [file-viewer-main](utility/file-viewer-main/) | 纯前端文件预览组件，支持 206 种扩展名 | TypeScript, Vue/React/Svelte, Three.js | 模块化渲染器架构（核心 + 独立渲染器 + 预设 + 框架组件）· 纯浏览器端解析（无需服务端转码）· 24 条预览管线 · 多框架支持（Vue 2/3/React/Svelte/jQuery/Web Components）· 按需懒加载 · Worker/WASM 解析 · 50+ npm 包分发 |
| [html-ppt-skill](utility/html-ppt-skill/) | HTML 演示文稿生成技能，36 主题 + 47 种动画 | HTML/CSS/JS，零构建步骤 | Token 驱动设计系统（36 个主题 CSS 文件）· 演讲者模式（4 张磁力卡：当前/预览/脚本/计时器 BroadcastChannel）· 27 种 CSS + 20 种 Canvas FX 动画 · 31 种单页布局 + 15 种完整模板 · 纯静态 HTML/CSS/JS · Iframe 隔离预览 |
| [super-space](utility/super-space/) | 3D 开放世界冒险游戏，程序化地形 + NPC 对话 | TypeScript, Three.js, React 19 | Simplex 噪声 + FBM 程序化地形（6 种生物群落）· React Three Fiber + Drei 声明式 3D · 昼夜循环系统（动态太阳/天空渐变/雾密度）· Post-processing 管线（Bloom/N8AO/Vignette/FXAA）· NPC 对话树 + 任务追踪 + 小地图 · LOD + Frustum Culling 性能优化 · Zustand 全局状态管理 |
| [zz-toolbox](utility/zz-toolbox/) | 中造工具箱，多项目整合的 Electron/Vue 桌面工具集 | JavaScript, Electron, Vite | 待完善/无 README |

### 📡 spatial/ — 空间智能

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [RuView](spatial/RuView/) | WiFi CSI 空间智能平台，穿墙感知人体/呼吸/姿态 | Rust, Python, ESP32, Candle, SNN | CSI 信道状态信息提取（ESP32 穿墙感知）· 非接触式生命体征监测（呼吸 0.1–0.5Hz / 心率 0.8–2.0Hz）· 17 关键点 WiFi 姿态估计（对比学习 + SNN）· 自监督 CSI 嵌入（128 维）· 多频段 3 倍感知带宽 · 边缘智能 105 个 Cog 模块 · 智能家居集成（Home Assistant/Matter）· Ed25519 见证链完整性证明 |

### 📚 learning/ — 学习资料与教程

| 项目 | 简介 | 技术栈 | 主要知识点 |
|---|---|---|---|
| [Hands-On-Large-Language-Models](learning/Hands-On-Large-Language-Models/) | 《Hands-On LLMs》配套代码，12 章 Jupyter 实战 | Python, PyTorch, Transformers | 完整 LLM 学习谱系（Token/Embedding → Transformer → 分类 → 聚类 → Prompt → 高级生成 → 语义搜索/RAG → 多模态 → 微调）· 文本分类与主题建模 · 嵌入模型创建与微调 · BERT 式 + 生成式模型微调 · Google Colab T4 GPU 实践 |
| [Python-100-Days](learning/Python-100-Days/) | Python 全栈 100 天教程（Web/数据分析/AI） | Python, Django, NumPy, Pandas | 30 天 Python 基础（数据类型/控制流/函数/OOP/IO/正则）· MySQL 数据库（DDL/DML/DQL/DCL）+ Hive · Django Web 框架全栈 · 爬虫（requests/BS/Selenium/Scrapy）· 数据科学（NumPy/Pandas/Matplotlib/Seaborn）· 机器学习经典算法 · DevOps（Docker/Nginx/uWSGI/CI/CD） |
| [awesome-ai-apps](learning/awesome-ai-apps/) | 80+ 个 LLM 应用示例（Agents/RAG/MCP/微调） | Python, LangChain, CrewAI, Streamlit | 14+ AI Agent 框架实战（LangChain/LangGraph/CrewAI/AutoGen/LlamaIndex/Mastra/DSPy）· 语音 Agent 管线（LiveKit/Pipecat/Deepgram/ElevenLabs）· MCP 服务端/客户端实现 · RAG 应用（Agentic RAG/混合搜索/PDF 分析/代码感知 RAG）· 多 Agent 生产管线 |
| [ai-agent-book](learning/ai-agent-book/) | AI Agent 设计原理 10 章 + 88 个配套项目 | Python, LangGraph, MCP, RAG | 核心公式 Agent = LLM + 上下文 + 工具 · 上下文工程（KV Cache/Prompt/Skills/压缩）· 用户记忆 + 知识库（RAG/知识图谱）· 工具系统（MCP 协议/三类工具/事件驱动）· Coding Agent · Agent 评估 · 模型后训练（SFT/RL Tradeoff）· 多 Agent 协作（群体智能/涌现 Agent 社会） |
| [yao-open-prompts](learning/yao-open-prompts/) | 117+ 中文 AI 提示词模板，按场景分类整理 | Markdown, YAML frontmatter | RTF 元提示系统（需求/任务架构/格式规范）· 9 大类 117 条提示词 · 统一 YAML frontmatter 规格 · GEO（生成引擎优化）营销提示 · 宽幅知识信息图提示 · 版本化持续更新机制 |
| [skills](learning/skills/) | Matt Pocock 实用工程技能，专注真实工程实践而非 Vibe Coding | Markdown SKILL.md, 斜杠命令 | "烤问"方法论（结构化访谈对齐 Agent 理解）· 共享语言/领域模型 · TDD 红线-绿线-重构 · 代码库架构持续改进 · 规约驱动开发 · 缺陷诊断（复现→最小化循环）· 双轴代码审查（标准合规 + 规约忠实度）· 真实工程学科 |
| [AI技能整理](learning/AI技能整理/) | AI 技能、页面生成、垂直领域 AI 应用等学习资料 | — | 待完善/无 README |

### 📋 planned/ — 计划 / 空目录

| 项目 | 预期方向 |
|---|---|
| [BuildingAI](planned/BuildingAI/) | Building AI 全栈平台，支持博客、知识库、AI 对话等 |
| [fpv-immersive-video-prompting](planned/fpv-immersive-video-prompting/) | FPV 运镜导演 AgentSkill |
| [Horizon](planned/Horizon/) | 新闻资讯聚合与阅读平台 |
| [html-video](planned/html-video/) | HTML 转视频工具 |
| [IDM-VTON](planned/IDM-VTON/) | 图像驱动虚拟试穿模型 |
| [mmdetection3d](planned/mmdetection3d/) | OpenMMLab 3D 目标检测工具箱 |

---

## 技术栈分布

> 基于各项目 README 的综合统计

| 类别 | 大概数量 | 代表 |
|---|---|---|
| **Python** | ~25+ | 后端核心语言，FastAPI / Django / Flask |
| **TypeScript/JavaScript** | ~15 | ArcReel, OmniRoute, Toonflow, agent-skills, skills |
| **React / Next.js** | ~10 | ArcReel, OmniRoute, OpenMAIC, ai-website-cloner |
| **Vue** | ~4 | huobao-drama, ai_story, file-viewer |
| **Rust** | ~3 | RuView (Rust), voicebox (Tauri), OpenCut (Rust core) |
| **Docker** | ~15+ | 大部分项目支持容器化部署 |
| **AI 供应商** | 多家 | DashScope, OpenAI, Claude, Gemini, MiniMax, Kling, Vidu, Grok, FLUX… |
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
- 新项目根据其功能放入对应分类文件夹；不确定时放 `utility/`。
- 根 `.gitignore` 只维护通用规则；子项目专属规则放在子项目自己的 `.gitignore` 中。
- 不要提交 `.env`、模型权重、临时输出、IDE 缓存、依赖安装目录和大型数据文件。
- `planned/` 中的空目录表明有意图但尚未填充内容；填充后移至对应分类。

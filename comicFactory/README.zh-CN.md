# Comic Factory

> **HTML 变成视频 — 在你的电脑上。** 带上你的本地 coding agent，描述一段视频或粘贴一个链接，agent 会把它变成多帧、全动画的视频 — 然后渲染成真正的 MP4。一个 agent 循环、可插拔渲染引擎、精选模板库、可选 AI 配乐。Apache-2.0，无按次渲染费用，无厂商锁定。

<p align="center"><a href="README.md">English</a> . <b>简体中文</b></p>

---

## 新方向：输入想法生成彩色漫画书

Comic Factory 正在从 HTML 视频生成底座，改造成 AI 彩色漫画书生成工作台：

- 输入一句想法、小说片段、文章链接或角色设定。
- 生成故事大纲、角色圣经、分镜脚本、彩色漫画页和对白气泡。
- 导出 PDF、PNG 页面包、Webtoon 长图，并复用现有渲染能力生成 MP4 预告片。

第一阶段改造已经开始：新增 ComicBook IR、漫画书计划持久化字段和商业落地文档。完整方案见 [docs/comic-book-business-plan.zh-CN.md](docs/comic-book-business-plan.zh-CN.md)。

---

## 为什么存在

HTML to Video 是一个真实的品类 — 但每个引擎都有自己的创作范式：

| 引擎 | 范式 | 在 Comic Factory 中 |
|---|---|---|
| Hyperframes | HTML + CSS + GSAP，agent-skill 驱动 | 已发布 — 默认引擎，通过 headless Chromium + ffmpeg 渲染真实 MP4 |
| Remotion | React 组件 | 计划中 |
| Motion Canvas . Revideo | TypeScript 生成器 | 计划中 |
| Manim 等 | 数学/3D 优先 | 调研中 |

**Comic Factory 是坐落在它们之上的元层。** 你跟 agent 对话；它选引擎、选模板、填入你的内容、渲染视频。引擎是实现细节，隐藏在一个统一的适配器接口后面。

---

## 快速开始

```bash
pnpm install
pnpm -r build
node packages/cli/dist/bin.js studio    # 打开 Studio http://127.0.0.1:3071
pnpm --filter @video-pipeline/studio-next dev # 打开绘画模块
```

CLI 工具：

```bash
node packages/cli/dist/bin.js doctor                 # 检测已安装的 agent 和引擎
node packages/cli/dist/bin.js search-templates --intent "github stars 比赛" --top 3
```

---

## 支持的 Agent

自动检测 PATH 中可用的 agent：

| Agent | 检测方式 |
|---|---|
| Vela | vela CLI |
| Claude Code | claude |
| Cursor Agent | cursor-agent |
| Codex CLI | codex |
| Hermes | hermes |
| Anthropic API | 自带 Key |

---

## 配乐

在 **设置 to 音频** 中添加 MiniMax API key，然后在项目 **配乐** 面板中：

- **背景音乐** — 描述一种情绪；MiniMax 生成器乐轨。
- **旁白** — 输入脚本；MiniMax 朗读 (TTS)。

两者通过 ffmpeg 混入导出 MP4。

---

## 架构

```
packages/
├── core/                  类型、注册表、编排器
├── content-graph/         多帧故事板 IR
├── runtime/               Agent 运行时
├── adapter-hyperframes/   Hyperframes 引擎适配器
├── cli/                   Comic Factory 命令 + Studio HTTP 服务
└── project-studio/        浏览器 Studio UI
templates/                 21 个精选模板
```

## 许可证

[Apache-2.0](LICENSE)

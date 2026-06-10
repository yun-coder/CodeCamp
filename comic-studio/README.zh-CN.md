# Comic Studio

> **AI 漫画小说图片集合工作流 — 5 阶段：创意 → 小说设定 → 图片清单 → 图片集合 → 导出。**

带上你的本地 coding agent，描述一段故事创意、粘贴文章链接或提供角色简介；agent 会规划漫画书、通过 MiniMax 生成每格图片，然后导出 PDF、PNG 分页包或 Webtoon 长图。

<p align="center"><b>简体中文</b> . <a href="README.md">English</a></p>

---

## 工作流程

```
创意 / 文章 / 角色简介
        │
        ▼
1. 故事规划        → 标题、钩子句、角色、视觉锁定
2. 分镜脚本        → 镜头类型、版式、图像 prompt、文字说明
3. 图片生成        → MiniMax image-01 渲染每一格
4. 预览            → 包含所有分格和文字说明的 HTML 预览
5. 导出            → PDF / PNG 分页包 / Webtoon 长图
```

单文件服务器（`src/server/index.ts`）+ React 前端。无需 monorepo，无需单独管理构建管线。

---

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式（两个终端）
pnpm dev          # API 服务器 → http://127.0.0.1:5174
pnpm dev:client   # Vite 前端  → http://127.0.0.1:5173

# 或一键启动
pnpm dev:all

# 生产构建
pnpm build
pnpm start         # 同时提供 API 和静态前端
```

在浏览器打开 **http://127.0.0.1:5173**

---

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `COMIC_STUDIO_PORT` | `5174` | API 服务器端口 |
| `COMIC_STUDIO_DATA_ROOT` | `process.cwd()` | 项目存储根目录（`<root>/.comic-studio/`） |
| `COMIC_STUDIO_MINIMAX_API_KEY` | — | MiniMax API 密钥，用于图片生成 |
| `COMIC_STUDIO_MINIMAX_BASE_URL` | `https://api.minimaxi.com/v1` | MiniMax 端点 |
| `COMIC_STUDIO_CHROME_PATH` | — | Chrome/Chromium 完整路径（用于 PDF 导出） |
| `COMIC_STUDIO_ALLOW_STUB` | — | 设为 `1` 启用离线 Stub Agent |

**API 密钥优先级：** `COMIC_STUDIO_MINIMAX_API_KEY` → `OD_MINIMAX_API_KEY` → `MINIMAX_API_KEY`

---

## 项目结构

```
comic-studio/
├── index.html                    — 前端入口
├── vite.config.ts                — Vite 开发服务器 + 代理配置
├── package.json
├── src/
│   ├── App.tsx                   — React 根组件
│   ├── api.ts                    — SSE 客户端辅助函数
│   ├── components/               — 9 个 UI 组件
│   │   ├── ProjectSidebar.tsx    — 项目列表侧边栏
│   │   ├── StoryPhase.tsx        — 阶段一：故事规划
│   │   ├── ScriptPhase.tsx       — 阶段二：分镜脚本
│   │   ├── ImagePhase.tsx        — 阶段三：图片生成
│   │   ├── ExportPhase.tsx       — 阶段四：导出
│   │   ├── ComicView.tsx         — 漫画预览面板
│   │   └── ChatPanel.tsx         — AI 创作助手聊天面板
│   ├── ir/
│   │   ├── comic.ts              — ComicBookPlan IR + 验证器
│   │   └── index.ts
│   └── server/
│       ├── index.ts              — HTTP 服务器入口
│       ├── agent.ts              — Claude Code + 离线 Stub
│       ├── minimax.ts            — MiniMax image_generation 调用
│       ├── prompts.ts            — 故事 / 分镜 prompt 构建器
│       ├── project-store.ts      — JSON 磁盘项目持久化
│       ├── comic-plan-store.ts   — ComicBookPlan 持久化
│       ├── preview-renderer.ts  — HTML 预览生成器
│       ├── pdf-export.ts         — HTML → PDF（puppeteer-core）
│       ├── errors.ts
│       ├── context.ts
│       ├── http.ts
│       ├── util.ts
│       └── routes/
│           ├── comic.ts          — 8 个漫画工作流端点
│           └── projects.ts       — 项目增删改查
└── dist/                         — 构建产物
    ├── client/                   — Vite 生产构建
    └── server/                   — 编译后的 Node.js 服务器
```

---

## API 端点

### 项目管理
- `GET  /api/projects`             — 列出所有项目
- `POST /api/projects`             — 创建项目
- `GET  /api/projects/:id`         — 加载单个项目
- `DELETE /api/projects/:id`       — 删除项目

### 漫画工作流
- `GET  /api/projects/:id/comic/plan`                — 读取计划
- `POST /api/projects/:id/comic/plan`                — 保存计划
- `POST /api/projects/:id/comic/generate-story`      — 阶段一（故事规划，SSE）
- `POST /api/projects/:id/comic/generate-panels`     — 阶段二（分镜脚本，SSE）
- `POST /api/projects/:id/comic/generate-image/:pid` — 单格重新生成
- `POST /api/projects/:id/comic/generate-all-images` — 阶段三（批量图片生成，SSE）
- `GET  /api/projects/:id/comic/preview`             — 渲染后的 HTML 预览
- `POST /api/projects/:id/comic/export/pdf`           — HTML → PDF
- `POST /api/projects/:id/comic/export/png`          — PNG 分页包
- `POST /api/projects/:id/comic/export/webtoon`       — Webtoon 长图

### 配置检查
- `GET /api/config/minimax`      — MiniMax 密钥是否已配置？

---

## 支持的 Agent

自动检测 PATH 中的可用 agent。Claude Code 是主要目标。

| Agent | 检测方式 | 备注 |
|---|---|---|
| Claude Code | `claude --version` | 主要 — 使用 `claude --print` |
| Stub（离线） | 始终可用 | 需设置 `COMIC_STUDIO_ALLOW_STUB=1` 激活 |

---

## 技术架构

Comic Studio 是 `comicFactory` monorepo 的**分支**，提取出来作为独立、轻量的漫画工作流工具。父级 monorepo 负责 HTML 转视频；本项目专注于漫画书管线。

关键设计决策：
- **非 workspace/pnpm monorepo** — 单一 `package.json`，部署简单。
- **内联实现** — `ProjectStore`、`ComicBookPlan` IR、Agent 运行时均直接复制进来而非从共享包导入，保证项目可移植性。
- **服务器 = 纯 API** — 开发时静态 UI 由 Vite 提供，生产时从 `dist/client/` 提供。生产模式下单进程同时处理两者。

---

## 许可证

[Apache-2.0](../LICENSE)
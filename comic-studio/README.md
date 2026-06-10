# Comic Studio

> **AI 漫画小说图片集合工作流 — 5 阶段：创意 → 小说设定 → 图片清单 → 图片集合 → 导出。**

Bring your local coding agent. Describe a story idea, paste an article link, or drop a character brief; the agent plans a comic book, generates panel images via MiniMax, then exports PDF, PNG page packs, or Webtoon long images.

<p align="center"><a href="README.zh-CN.md">简体中文</a> . <b>English</b></p>

---

## What it does

```
idea / article / character brief
        │
        ▼
1. Story planning        → title, logline, characters, visual locks
2. Page/panel script     → shot types, layouts, image prompts, lettering
3. Image generation       → MiniMax image-01 renders each panel
4. Preview               → HTML preview with all panels + lettering
5. Export                → PDF / PNG packs / Webtoon long image
```

Single-file studio (`src/server/index.ts`) + React UI. No monorepo, no build pipeline to manage separately.

---

## Quick start

```bash
# Install
pnpm install

# Development (two terminals)
pnpm dev          # API server → http://127.0.0.1:5174
pnpm dev:client   # Vite UI   → http://127.0.0.1:5173

# Or in one command
pnpm dev:all

# Production build
pnpm build
pnpm start         # serves both API + static UI
```

Open **http://127.0.0.1:5173** in your browser.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `COMIC_STUDIO_PORT` | `5174` | API server port |
| `COMIC_STUDIO_DATA_ROOT` | `process.cwd()` | Where projects are stored (`<root>/.comic-studio/`) |
| `COMIC_STUDIO_MINIMAX_API_KEY` | — | MiniMax API key for image generation |
| `COMIC_STUDIO_MINIMAX_BASE_URL` | `https://api.minimaxi.com/v1` | MiniMax endpoint |
| `COMIC_STUDIO_CHROME_PATH` | — | Full path to Chrome/Chromium for PDF export |
| `COMIC_STUDIO_ALLOW_STUB` | — | Set to `1` to enable offline stub agent |

**Priority for API key:** `COMIC_STUDIO_MINIMAX_API_KEY` → `OD_MINIMAX_API_KEY` → `MINIMAX_API_KEY`

---

## Project layout

```
comic-studio/
├── index.html                    — frontend entry
├── vite.config.ts                — Vite dev server + proxy
├── package.json
├── src/
│   ├── App.tsx                   — React root
│   ├── api.ts                    — SSE client helpers
│   ├── components/               — 9 UI components
│   │   ├── ProjectSidebar.tsx
│   │   ├── StoryPhase.tsx
│   │   ├── ScriptPhase.tsx
│   │   ├── ImagePhase.tsx
│   │   ├── ExportPhase.tsx
│   │   ├── ComicView.tsx
│   │   └── ChatPanel.tsx
│   ├── ir/
│   │   ├── comic.ts              — ComicBookPlan IR + validator
│   │   └── index.ts
│   └── server/
│       ├── index.ts              — HTTP server entry point
│       ├── agent.ts              — Claude Code + offline stub
│       ├── minimax.ts            — MiniMax image_generation
│       ├── prompts.ts            — story / script prompt builders
│       ├── project-store.ts      — JSON-on-disk project persistence
│       ├── comic-plan-store.ts   — ComicBookPlan persistence
│       ├── preview-renderer.ts    — HTML preview generator
│       ├── pdf-export.ts         — HTML → PDF via puppeteer-core
│       ├── errors.ts
│       ├── context.ts
│       ├── http.ts
│       ├── util.ts
│       └── routes/
│           ├── comic.ts          — 8 comic workflow endpoints
│           └── projects.ts       — project CRUD
└── dist/                         — build output
    ├── client/                   — Vite production build
    └── server/                   — compiled Node.js server
```

---

## API endpoints

### Projects
- `GET  /api/projects`          — list all
- `POST /api/projects`          — create
- `GET  /api/projects/:id`      — load one
- `DELETE /api/projects/:id`     — delete

### Comic workflow
- `GET  /api/projects/:id/comic/plan`              — read plan
- `POST /api/projects/:id/comic/plan`              — save plan
- `POST /api/projects/:id/comic/generate-story`    — phase 2 (SSE)
- `POST /api/projects/:id/comic/generate-panels`  — phase 3 (SSE)
- `POST /api/projects/:id/comic/generate-image/:pid` — single panel regen
- `POST /api/projects/:id/comic/generate-all-images` — phase 4 (SSE)
- `GET  /api/projects/:id/comic/preview`           — rendered HTML
- `POST /api/projects/:id/comic/export/pdf`        — HTML → PDF
- `POST /api/projects/:id/comic/export/png`         — PNG page pack
- `POST /api/projects/:id/comic/export/webtoon`    — long image

### Config
- `GET /api/config/minimax`     — is the key configured?

---

## Supported agents

Auto-detected on PATH. Claude Code is the primary target.

| Agent | Detection | Notes |
|---|---|---|
| Claude Code | `claude --version` | Primary — `claude --print` |
| Stub (offline) | Always available | Set `COMIC_STUDIO_ALLOW_STUB=1` to activate |

---

## Architecture

Comic Studio is a **fork** of the `comicFactory` monorepo, extracted to be a self-contained, dependency-light comic workflow tool. The parent monorepo handles HTML-to-video; this project focuses exclusively on the comic book pipeline.

Key design decisions:
- **No workspace/pnpm monorepo** — single `package.json`, straightforward deploy.
- **Inline implementations** — `ProjectStore`, `ComicBookPlan` IR, agent runtime are all copied in rather than imported from a shared package. Keeps the project portable.
- **Server = API only** — static UI is built by Vite in dev, served from `dist/client/` in production. One process handles both in prod mode.

---

## License

[Apache-2.0](../LICENSE)
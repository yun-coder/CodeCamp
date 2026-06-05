# video-pipeline

> **HTML becomes video — on your laptop.** Bring your local coding agent. Describe a video, or paste an article link, and the agent turns it into a multi-frame, fully animated video — then renders it to a real MP4 right on your machine. One agent loop, pluggable rendering engines, a curated template gallery, optional AI soundtrack. Apache-2.0, no per-render fees, no vendor lock-in.

<p align="center"><b>English</b> . <a href="README.zh-CN.md">简体中文</a></p>

---

## Why this exists

HTML to Video is a real category — but every engine is opinionated, and each wants you to learn *its* authoring model:

| Engine | Paradigm | Tradeoff | In video-pipeline |
|---|---|---|---|
| Hyperframes | HTML + CSS + GSAP, agent-skill driven | Single rendering paradigm | Shipped — the default engine; renders real MP4 via headless Chromium + ffmpeg |
| Remotion | React components | Source-available, paid above 4 devs | Planned |
| Motion Canvas . Revideo | TypeScript generators on canvas | Best for explainers, code-first | Planned |
| Manim and friends | Math / 3D first | Niche | Researching |

**video-pipeline is the meta-layer that sits above all of them.** You talk to your agent; it picks the engine, picks the template, fills in your content, and renders the video. The engine is an implementation detail behind a single adapter interface.

> **Status:** the pluggable-engine architecture is in place, and the **Hyperframes engine is fully wired up and renders real MP4** — headless Chromium records the animated HTML frame-by-frame and ffmpeg encodes it (libx264). Remotion, Motion Canvas / Revideo, and Manim are on the roadmap.

---

## At a glance

| | |
|---|---|
| **Coding agents (6)** | Vela . Claude Code . Cursor Agent . Codex CLI . Hermes . Anthropic Messages API — auto-detected on your PATH |
| **Real MP4 render** | Headless Chromium records the animated HTML and ffmpeg encodes it (libx264) — locally, no cloud render, no per-clip fee. |
| **Article / repo to video** | Paste a URL or GitHub repo; the studio fetches it server-side and builds the video from the real content. |
| **21 templates** | Curated patterns: data viz, product promos, social shorts, explainers, kinetic type, transitions. |
| **Multi-frame storyboards** | A content-graph drives multi-scene videos; edit per-frame text inline, reorder, re-render. |
| **AI soundtrack** | Optional background music + narration via MiniMax, mixed into the MP4 at export. |
| **Studio + CLI** | A local browser studio *and* a scriptable CLI. |
| **License** | Apache-2.0 — no per-render fees, no seat caps. |

---

## How it works

```
  prompt / link / repo
        |
        v
  1. source fetch        studio pulls the URL or repo server-side, flattens it to Markdown
        |
        v
  2. agent loop          your agent reads the material + template style and emits
        |                a content-graph (storyboard) + one HTML block per frame
        v
  3. content-graph       multi-frame IR: nodes + edges, topo-sorted into frame order & timing
        |
        v
  4. per-frame HTML      each node becomes a self-contained animated HTML frame on disk
        |
        v
  5. render engine       headless Chromium loads each frame, records animation to webm per frame
        |
        v
  6. ffmpeg              each webm to mp4 (libx264), then concat into one video;
        |                optional MiniMax music + narration mixed in
        v
      your.mp4
```

Single-frame videos take a fast path that skips the content-graph — one template, one HTML, straight to render.

---

## Quick start

```bash
pnpm install
pnpm -r build
node packages/cli/dist/bin.js studio    # opens the studio at http://127.0.0.1:3071
```

CLI utilities:

```bash
node packages/cli/dist/bin.js doctor                 # detect installed agents + engines
node packages/cli/dist/bin.js search-templates --intent "github stars race" --top 3
```

---

## Supported agents

Auto-detected on your PATH; switch the active one from the studio top bar.

| Agent | Detection | Invocation |
|---|---|---|
| Vela | vela CLI | ACP over stdio |
| Claude Code | claude | claude --print |
| Cursor Agent | cursor-agent | cursor-agent --print |
| Codex CLI | codex | codex exec |
| Hermes | hermes | Hermes ACP CLI |
| Anthropic API | BYOK | Direct Messages API |

Nothing installed? Set an Anthropic key and the studio talks to the Messages API directly.

---

## Soundtrack

In **Settings to Audio**, add a MiniMax API key, then in the per-project **Soundtrack** panel:

- **Background music** — describe a mood; MiniMax generates an instrumental track.
- **Narration** — type a script; MiniMax reads it (TTS).

Both are mixed into the exported MP4 via ffmpeg. No key configured? The rest of the studio works unchanged.

---

## Architecture

```
packages/
├── core/                  Project / Asset / ContentGraph types, registries, orchestrator
├── content-graph/         Multi-frame storyboard IR (nodes + edges, topo-sort)
├── runtime/               Agent runtime — detect / spawn / stream
├── adapter-hyperframes/   Hyperframes engine adapter — real render via Chromium + ffmpeg
├── cli/                   video-pipeline command + the studio HTTP server + source fetching
└── project-studio/        Browser studio UI (chat, template gallery, frames, soundtrack, export)
templates/                 21 curated video templates
```

## License

[Apache-2.0](LICENSE)

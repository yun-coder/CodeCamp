# Comic Factory

> **Ideas become color comic books — on your laptop.** Bring your local coding agent. Describe a story idea, paste an article link, or drop a character brief; the agent plans a book, generates pages and lettering, then can export page packs or a trailer MP4 with the local render pipeline.

<p align="center"><b>English</b> . <a href="README.zh-CN.md">简体中文</a></p>

---

## Product Direction: Ideas To Color Comic Books

Comic Factory is being refocused from an HTML-to-video foundation into an AI color comic book studio.

- Input an idea, story fragment, article link, character brief, or brand material.
- Generate a story brief, character bible, page plan, panels, color artwork prompts, and lettering overlays.
- Export PDF, PNG page packs, Webtoon long images, and MP4 trailers using the existing render pipeline.

Phase one has started with a ComicBook IR, project-level comic plan persistence, and a commercial rollout plan. See [docs/comic-book-business-plan.zh-CN.md](docs/comic-book-business-plan.zh-CN.md).

---

## Why this exists

AI comic creation is shifting from one-off images to repeatable book production. The hard part is not only drawing a nice panel; it is keeping characters, page beats, lettering, page formats, and exports consistent across the whole book.

Comic Factory keeps the existing HTML rendering foundation, but turns the product surface into a comic-book workflow:

| Layer | Role | In Comic Factory |
|---|---|---|
| Book planning | Story premise, audience, page count, story beats | `ComicBookPlan` IR and content graph |
| Character bible | Recurring cast, visual traits, voice | Project-level comic settings and future generation constraints |
| Page generation | HTML/CSS comic pages with panels and lettering | Existing preview and page rendering pipeline |
| Export | PDF/PNG/Webtoon packs, plus trailer MP4 | Reuses Chromium + ffmpeg where useful |

> **Status:** the commercial plan and first technical foundation are in place: ComicBook IR, comic plan persistence, and Studio copy/workflow refocus. The MP4 renderer remains useful for book trailers while PDF/PNG/Webtoon export becomes the main product target.

---

## At a glance

| | |
|---|---|
| **Coding agents (6)** | Vela . Claude Code . Cursor Agent . Codex CLI . Hermes . Anthropic Messages API — auto-detected on your PATH |
| **Comic book workflow** | Idea → premise → characters → page plan → panels → lettering → export. |
| **Article / novel to comic** | Paste source material; the studio grounds page beats, captions, and dialogue in the real content. |
| **Page style packs** | Curated visual baselines for American color comics, Webtoon, picture-book, and branded adaptations. |
| **Multi-page book plan** | A content graph drives page order and timing; edit page text inline, re-render individual pages. |
| **Trailer audio** | Optional background music + narration via MiniMax, mixed into trailer exports. |
| **Studio + CLI** | A local browser studio *and* a scriptable CLI. |
| **License** | Apache-2.0 — no per-render fees, no seat caps. |

---

## How it works

```
  idea / link / manuscript
        |
        v
  1. source intake       studio collects the idea, article, manuscript, or character brief
        |
        v
  2. book planning       your agent turns it into premise, characters, page beats, and style
        v
  3. comic IR            ComicBookPlan + content graph: pages, panels, lettering, timing
        |
        v
  4. page HTML           each page becomes a self-contained color comic page on disk
        |
        v
  5. render/export       headless Chromium renders pages and trailer scenes
        |
        v
  6. package             PDF/PNG/Webtoon page packs; optional MiniMax music + narration
        v
      your comic book
```

Single-page drafts take a fast path; multi-page books use the book plan so pages stay coherent.

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
├── content-graph/         ComicBookPlan + page/content graph IR
├── runtime/               Agent runtime — detect / spawn / stream
├── adapter-hyperframes/   Hyperframes engine adapter — real render via Chromium + ffmpeg
├── cli/                   Comic Factory command + Studio HTTP server + source fetching
└── project-studio/        Browser studio UI (chat, page styles, pages, trailer audio, export)
templates/                 curated page style packs and legacy render templates
```

## License

[Apache-2.0](LICENSE)

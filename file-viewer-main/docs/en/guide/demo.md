# Demo Guide

<div class="doc-kicker">Real Samples, Real Renderers</div>

<p class="doc-lead">
  The official demo is the fastest way to verify renderer behavior, toolbar operations, mobile layout, archive nesting, comparison, and offline asset loading.
</p>

## Demo URLs

- Main demo: [demo.file-viewer.app](https://demo.file-viewer.app)
- Document comparison: [demo.file-viewer.app/compare.html](https://demo.file-viewer.app/compare.html)
- Official portal: [file-viewer.app](https://file-viewer.app)

## What To Check

| Area | What to verify |
| --- | --- |
| Scenario shortcuts | First-time users can open Word, Excel, PowerPoint, DWG, archive, and email samples without navigating the full matrix |
| Copyable code | The sidebar shows a React `@file-viewer/react-full` snippet for the current file, with a copy action |
| Sample selector | Files are grouped by type, collapsible, and the selected group stays discoverable |
| Toolbar | Download, print, HTML export, watermark, search, zoom, navigation, and format-specific actions appear only when supported |
| PDF | Page thumbnails, outline tree, floating toolbar, fit-to-width, search highlights, and side panel toggling |
| Word | Stream-style document reading, correct text flow, printing without clipped first-page-only output |
| Spreadsheet | Sheet tabs remain readable on desktop and mobile; optional column resize can be enabled |
| Archive | Nested entries preview through the same renderer registry, with safe metadata filtering and cache support |
| Mobile | Content stays central, controls move to compact floating actions, and heavy renderers remain lazy |

## Language-Aware Samples

The demo follows the browser language by default. Chinese browsers open the Chinese sample system; other languages open the English sample system. You can also force the language with `?lang=zh-CN` or `?lang=en-US`.

The English demo uses public real-world samples for DOCX, PDF, PPTX, and XLSX, plus local lightweight fixtures for Markdown, text, logs, CSV, JSON, TypeScript, JavaScript, GeoJSON, glTF, and archive nesting. All files are served from the demo origin so enterprise intranet deployments do not depend on public CDNs at runtime.

## Local Demo

```bash
pnpm install
pnpm dev
```

The Vite dev server serves the main demo. Open `/compare.html` on the same host to test side-by-side comparison.

## Production Smoke

The repository keeps browser smoke scripts for the demo and component packages:

```bash
pnpm verify:demo-browser-smoke
pnpm verify:component-browser-smoke
pnpm verify:browser-smoke
```

Use these checks before publishing a release that touches renderers, assets, toolbar behavior, search, print, or sample files.

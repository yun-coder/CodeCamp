/**
 * Render a ComicBookPlan into a self-contained preview HTML page.
 *
 * Lifted from @video-pipeline/cli/src/studio-server.ts → renderComicPreviewHtml.
 * No external dependencies — pure string templating. Writes the file to
 * <projectDir>/comic/preview.html.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ComicBookPlan } from '../ir/comic.js';
import type { ProjectStore } from './project-store.js';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function comicPreviewCss(): string {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#1a1a2e;color:#e0e0e0;line-height:1.5}
.comic-header{text-align:center;padding:32px 16px 24px;background:linear-gradient(180deg,#16213e 0%,#1a1a2e 100%);border-bottom:2px solid #e94560}
.comic-header h1{font-size:2.2rem;color:#fff;margin-bottom:8px;font-family:Georgia,serif}
.comic-header .logline{font-size:1.1rem;color:#a0a0c0;max-width:600px;margin:0 auto 12px;font-style:italic}
.comic-header .meta{display:flex;gap:16px;justify-content:center;font-size:.8rem;color:#666}
.comic-pages{max-width:900px;margin:0 auto;padding:24px 16px}
.page{margin-bottom:40px;background:#16213e;border-radius:12px;padding:20px;border:1px solid #0f3460}
.page-title{font-size:1.1rem;color:#e94560;margin-bottom:16px;font-family:Georgia,serif}
.page-content{display:grid;gap:12px}
.page-two-panel .page-content{grid-template-columns:1fr 1fr}
.page-three-panel .page-content{grid-template-columns:1fr 1fr 1fr}
.page-four-panel-grid .page-content{grid-template-columns:1fr 1fr}
.page-manga-grid .page-content{grid-template-columns:1fr 1fr 1fr;grid-auto-rows:minmax(120px,auto)}
.page-webtoon-scroll .page-content{display:flex;flex-direction:column;gap:16px}
.panel{position:relative;background:#0f3460;border-radius:8px;overflow:hidden;min-height:150px}
.panel img{width:100%;height:auto;display:block}
.panel-placeholder{display:grid;place-items:center;min-height:150px;background:linear-gradient(135deg,#0f3460 0%,#1a1a2e 100%);padding:16px;text-align:center}
.panel-placeholder span{font-size:1.2rem;color:#e94560;font-weight:600}
.panel-placeholder small{display:block;color:#666;margin-top:4px;font-size:.75rem}
.balloon{position:absolute;background:rgba(255,255,255,.95);color:#111;border-radius:12px;padding:6px 10px;font-size:.82rem;pointer-events:none;z-index:2}
.balloon.speech{border-radius:12px 12px 12px 4px}
.balloon.thought{border-radius:50%;background:rgba(255,255,255,.85);font-style:italic}
.balloon.caption{position:static;background:rgba(0,0,0,.6);color:#fff;border-radius:4px;font-size:.75rem;margin:4px 0}
.balloon.sfx{font-size:1.5rem;font-weight:900;color:#e94560;background:transparent;text-transform:uppercase}
.balloon .speaker{display:block;font-size:.65rem;color:#e94560;font-weight:700;margin-bottom:2px}
.page-summary{font-size:.8rem;color:#666;margin-top:12px;text-align:center;font-style:italic}
.comic-footer{text-align:center;padding:20px;color:#444;font-size:.75rem;border-top:1px solid #0f3460}
@media print{body{background:#fff;color:#000}.page{background:#fff;border:1px solid #ccc;break-inside:avoid}.balloon{background:rgba(255,255,255,.95);color:#000}}
`;
}

export async function renderComicPreviewHtml(
  projectId: string,
  projects: ProjectStore,
  plan: ComicBookPlan,
): Promise<string> {
  const projectDir = await projects.ensureDir(projectId);
  const comicDir = join(projectDir, 'comic');
  await mkdir(comicDir, { recursive: true });

  const pagesHtml = plan.pages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((page) => {
      const panels = page.panels
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((panel) => {
          const imgHtml = panel.generatedImageAssetId
            ? `<img src="/preview/${projectId}/comic/images/${panel.generatedImageAssetId}.png" alt="Panel ${panel.order}" />`
            : `<div class="panel-placeholder"><span>Panel ${panel.order}</span><small>${escapeHtml(panel.imagePrompt.slice(0, 80))}...</small></div>`;
          const letteringHtml = panel.lettering
            .map((l) => {
              const cls = `balloon ${l.kind}`;
              const placement = l.placement
                ? `style="left:${(l.placement.x * 100).toFixed(1)}%;top:${(l.placement.y * 100).toFixed(1)}%;width:${(l.placement.width * 100).toFixed(1)}%;height:${(l.placement.height * 100).toFixed(1)}%"`
                : '';
              const speaker = l.speakerCharacterId
                ? plan.characters.find((c) => c.id === l.speakerCharacterId)
                : null;
              return `<div class="${cls}" ${placement}><span class="speaker">${speaker ? escapeHtml(speaker.name) : ''}</span><span class="text">${escapeHtml(l.text)}</span></div>`;
            })
            .join('');
          return `<div class="panel panel-${panel.shot}">${imgHtml}${letteringHtml}</div>`;
        })
        .join('');
      return `<section class="page page-${page.layout}" id="${page.id}">
        ${page.title ? `<h2 class="page-title">${escapeHtml(page.title)}</h2>` : ''}
        <div class="page-content">${panels}</div>
        ${page.summary ? `<p class="page-summary">${escapeHtml(page.summary)}</p>` : ''}
      </section>`;
    })
    .join('');

  const styleCss = comicPreviewCss();
  const html = `<!doctype html>
<html lang="${plan.language || 'en'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(plan.title)} — Comic Preview</title>
<style>${styleCss}</style></head>
<body>
<header class="comic-header">
  <h1>${escapeHtml(plan.title)}</h1>
  <p class="logline">${escapeHtml(plan.logline)}</p>
  <div class="meta">
    <span>Style: ${escapeHtml(plan.style)}</span>
    <span>Pages: ${plan.pages.length}</span>
    <span>Audience: ${escapeHtml(plan.audience)}</span>
  </div>
</header>
<main class="comic-pages">${pagesHtml}</main>
<footer class="comic-footer">
  <p>Generated by Comic Studio</p>
</footer>
</body></html>`;

  const htmlPath = join(comicDir, 'preview.html');
  await writeFile(htmlPath, html, 'utf8');
  return htmlPath;
}

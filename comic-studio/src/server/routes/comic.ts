/**
 * Comic workflow routes — the heart of this project.
 *
 * Eight HTTP endpoints covering the 5-phase workflow:
 *   1. GET  /api/projects/:id/comic/plan                  — read persisted plan
 *   2. POST /api/projects/:id/comic/plan                  — overwrite plan
 *   3. POST /api/projects/:id/comic/generate-story        — phase 2 (SSE)
 *   4. POST /api/projects/:id/comic/generate-panels       — phase 3 (SSE)
 *   5. POST /api/projects/:id/comic/generate-image/:pid   — single panel regen
 *   6. POST /api/projects/:id/comic/generate-all-images   — phase 4 (SSE)
 *   7. GET  /api/projects/:id/comic/preview               — render preview HTML
 *   8. POST /api/projects/:id/comic/export/{pdf,png,webtoon}
 *
 * All lifted from @video-pipeline/cli/src/studio-server.ts and adapted to
 * this project's inlined ProjectStore / ComicPlanStore / Agent runtime.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { copyFileSync, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ComicAudience,
  ComicBookPlan,
  ComicCharacter,
  ComicFormat,
  ComicStyle,
} from '../../ir/comic.js';
import type { ServerContext } from '../context.js';
import { readJsonBody } from '../http.js';
import { generateImage, resolveMinimaxCredentials } from '../minimax.js';
import { detectFirstAvailable, findAgent } from '../agent.js';
import { buildComicStoryPrompt, buildComicScriptPrompt } from '../prompts.js';
import { renderComicPreviewHtml, escapeHtml } from '../preview-renderer.js';
import { extractJson, sanitizeFilename } from '../util.js';
import { htmlToPdf } from '../pdf-export.js';

const FORMAT_TO_ASPECT: Record<string, '1:1' | '16:9' | '3:4' | '9:16' | '4:3'> = {
  book: '3:4',
  webtoon: '9:16',
  strip: '16:9',
};

function sseHeaders(): Record<string, string> {
  return {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  };
}

function sseSend(res: ServerResponse, obj: unknown): void {
  try {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(obj)}\n\n`);
  } catch {
    /* client gone */
  }
}

// =============================================================================
// 1 + 2. Comic plan CRUD
// =============================================================================

export async function handleComicPlanGet(
  projectId: string,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  const plan = await ctx.planStore.readComicBookPlan(projectId);
  if (!plan) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'No comic book plan' }));
    return;
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ plan }));
}

export async function handleComicPlanPost(
  projectId: string,
  req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const plan = body.plan as ComicBookPlan | undefined;
    if (!plan) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'plan is required' }));
      return;
    }
    const { project } = await ctx.planStore.writeComicBookPlan(projectId, plan);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ project }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: msg }));
  }
}

// =============================================================================
// 3. generate-story (SSE)
// =============================================================================

export async function handleComicGenerateStory(
  projectId: string,
  req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  const body = await readJsonBody(req);
  const idea = ((body.idea as string) ?? (body.prompt as string) ?? '').trim();
  if (!idea) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'idea is required' }));
    return;
  }
  const style = (body.style as string) || 'american-color';
  const audience = (body.audience as string) || 'teen';
  const language = (body.language as string) || (body.lang as string) || 'zh';

  res.writeHead(200, sseHeaders());
  const sse = (obj: unknown) => sseSend(res, obj);

  try {
    sse({ type: 'story_started', phase: 'story' });

    const project = await ctx.projects.load(projectId);
    let agentDef = project.agentId ? findAgent(project.agentId) : undefined;
    if (!agentDef) {
      const detected = await detectFirstAvailable();
      if (detected) agentDef = detected;
    }
    if (!agentDef) {
      sse({
        type: 'story_failed',
        message:
          'No agent available — install Claude Code (`claude` on PATH), or set COMIC_STUDIO_ALLOW_STUB=1 to use the offline stub.',
      });
      res.end();
      return;
    }

    const prompt = buildComicStoryPrompt(idea, style, audience, language, '');
    let buf = '';
    const handle = agentDef.spawn({
      prompt,
      cwd: ctx.dataRoot,
      ...(project.agentModel ? { model: project.agentModel } : {}),
      onEvent: (ev) => {
        if (ev.type === 'text') {
          buf += ev.chunk;
          sse({ type: 'text', chunk: ev.chunk });
        } else if (ev.type === 'error') sse({ type: 'warning', message: ev.message });
      },
    });
    const exit = await handle.done;
    if (exit.exitCode !== 0 || !buf.trim()) {
      sse({ type: 'story_failed', message: `Agent exited with code ${exit.exitCode}` });
      res.end();
      return;
    }

    let plan: Record<string, unknown>;
    try {
      const json = extractJson(buf);
      plan = JSON.parse(json) as Record<string, unknown>;
    } catch {
      process.stderr.write(`[comic:generate-story] extractJson failed. buf head(300): ${buf.slice(0, 300)}\n`);
      process.stderr.write(`[comic:generate-story] buf tail(300): ${buf.slice(-300)}\n`);
      sse({ type: 'story_failed', message: 'Agent returned invalid JSON — please try again' });
      res.end();
      return;
    }

    const comicPlan: ComicBookPlan = {
      schemaVersion: 1,
      format: ((body.format as ComicFormat) || 'book'),
      style: style as ComicStyle,
      audience: audience as ComicAudience,
      title: (plan.title as string) || 'Untitled',
      logline: (plan.logline as string) || '',
      synopsis: (plan.synopsis as string) || '',
      language,
      pageCount: (body.pageCount as number) || 8,
      characters: (((plan.characters as Array<Record<string, unknown>>) || []).map(
        (c, i) => buildComicCharacter(c, i),
      )) as ComicCharacter[],
      pages: [],
      exportTargets: { pdf: true, pngPages: true, webtoonLongImage: true, mp4Trailer: false },
      safety: {
        originalCharactersOnly: true,
        disallowLivingArtistStyleImitation: true,
        commercialUseIntended: false,
      },
    };

    await ctx.planStore.writeComicBookPlan(projectId, comicPlan);
    sse({ type: 'story_done', plan: comicPlan });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[comic:generate-story] ${msg}\n`);
    sse({ type: 'story_failed', message: msg });
  }
  res.end();
}

function buildComicCharacter(c: Record<string, unknown>, i: number): ComicCharacter {
  const visual = (c.visual as Record<string, unknown>) ?? {};
  return {
    id: (c.id as string) || `char-${i + 1}`,
    name: (c.name as string) || `Character ${i + 1}`,
    role: ((c.role as ComicCharacter['role']) || 'supporting') as ComicCharacter['role'],
    personality: (c.personality as string) || '',
    visual: {
      description: (visual.description as string) || '',
      palette: (visual.palette as string[]) || ['#000000', '#ffffff'],
      negativePrompt: (visual.negativePrompt as string) || '',
      referenceAssetIds: (visual.referenceAssetIds as string[]) || [],
    },
  };
}

// =============================================================================
// 4. generate-panels (SSE)
// =============================================================================

export async function handleComicGeneratePanels(
  projectId: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  const plan = await ctx.planStore.readComicBookPlan(projectId);
  if (!plan) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'No comic book plan — generate the story first' }));
    return;
  }

  res.writeHead(200, sseHeaders());
  const sse = (obj: unknown) => sseSend(res, obj);

  try {
    sse({ type: 'panels_started', phase: 'panels', pageCount: plan.pageCount });

    const project = await ctx.projects.load(projectId);
    let agentDef = project.agentId ? findAgent(project.agentId) : undefined;
    if (!agentDef) {
      const detected = await detectFirstAvailable();
      if (detected) agentDef = detected;
    }
    if (!agentDef) {
      sse({ type: 'panels_failed', message: 'No agent available' });
      res.end();
      return;
    }

    const prompt = buildComicScriptPrompt(plan as unknown as Record<string, unknown>);
    let buf = '';
    const handle = agentDef.spawn({
      prompt,
      cwd: ctx.dataRoot,
      ...(project.agentModel ? { model: project.agentModel } : {}),
      onEvent: (ev) => {
        if (ev.type === 'text') {
          buf += ev.chunk;
          sse({ type: 'text', chunk: ev.chunk });
        } else if (ev.type === 'error') sse({ type: 'warning', message: ev.message });
      },
    });
    const exit = await handle.done;
    if (exit.exitCode !== 0 || !buf.trim()) {
      sse({ type: 'panels_failed', message: `Agent exited with code ${exit.exitCode}` });
      res.end();
      return;
    }

    let pageData: Record<string, unknown>;
    try {
      const json = extractJson(buf);
      pageData = JSON.parse(json) as Record<string, unknown>;
    } catch {
      process.stderr.write(`[comic:generate-panels] extractJson failed. buf head(300): ${buf.slice(0, 300)}\n`);
      process.stderr.write(`[comic:generate-panels] buf tail(300): ${buf.slice(-300)}\n`);
      sse({ type: 'panels_failed', message: 'Agent returned invalid JSON' });
      res.end();
      return;
    }

    const pages = (pageData.pages as Array<Record<string, unknown>>) || [];
    const updatedPlan: ComicBookPlan = { ...plan, pages: pages as unknown as ComicBookPlan['pages'] };

    await ctx.planStore.writeComicBookPlan(projectId, updatedPlan);
    const htmlPath = await renderComicPreviewHtml(projectId, ctx.projects, updatedPlan);
    const totalPanels = pages.reduce(
      (s, p) => s + (((p.panels as unknown[]) ?? []).length),
      0,
    );
    sse({ type: 'panels_done', plan: updatedPlan, totalPanels, previewPath: htmlPath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[comic:generate-panels] ${msg}\n`);
    sse({ type: 'panels_failed', message: msg });
  }
  res.end();
}

// =============================================================================
// 5 + 6. Image generation
// =============================================================================

async function resolveCredsOr400(ctx: ServerContext, res: ServerResponse): Promise<ReturnType<typeof resolveMinimaxCredentials> | null> {
  const creds = resolveMinimaxCredentials();
  if (!creds) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        error:
          'MiniMax API key not configured — set COMIC_STUDIO_MINIMAX_API_KEY in your environment',
      }),
    );
    return null;
  }
  void ctx; // reserved for future config
  return creds;
}

export async function handleComicGenerateSingleImage(
  projectId: string,
  panelId: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  const plan = await ctx.planStore.readComicBookPlan(projectId);
  if (!plan) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'No comic book plan' }));
    return;
  }
  const panel = plan.pages.flatMap((p) => p.panels).find((p) => p.id === panelId);
  if (!panel) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: `Panel ${panelId} not found` }));
    return;
  }
  const creds = await resolveCredsOr400(ctx, res);
  if (!creds) return;

  try {
    const aspect = FORMAT_TO_ASPECT[plan.format] || '3:4';
    const images = await generateImage({
      prompt: panel.imagePrompt,
      ...(panel.negativePrompt ? { negativePrompt: panel.negativePrompt } : {}),
      aspectRatio: aspect,
      style: plan.style,
      creds,
    });
    if (images.length > 0) {
      const projectDir = await ctx.projects.ensureDir(projectId);
      const imgDir = join(projectDir, 'comic', 'images');
      await mkdir(imgDir, { recursive: true });
      for (let i = 0; i < images.length; i++) {
        const img = images[i]!;
        const assetId = `comic-${panelId}-${i}`;
        const imgPath = join(imgDir, `${assetId}.png`);
        await writeFile(imgPath, img.bytes);
        panel.generatedImageAssetId = assetId;
      }
      await ctx.planStore.writeComicBookPlan(projectId, plan);
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, panel }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: msg }));
  }
}

export async function handleComicGenerateAllImages(
  projectId: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  const plan = await ctx.planStore.readComicBookPlan(projectId);
  if (!plan) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'No comic book plan' }));
    return;
  }
  const creds = await resolveCredsOr400(ctx, res);
  if (!creds) return;

  res.writeHead(200, sseHeaders());
  const sse = (obj: unknown) => sseSend(res, obj);

  try {
    const panels = plan.pages
      .flatMap((p) => p.panels)
      .filter((p) => p.imagePrompt?.trim());
    const total = panels.length;
    if (total === 0) {
      sse({ type: 'images_failed', message: 'No panels with image prompts found' });
      res.end();
      return;
    }

    sse({ type: 'images_started', total });
    const projectDir = await ctx.projects.ensureDir(projectId);
    const imgDir = join(projectDir, 'comic', 'images');
    await mkdir(imgDir, { recursive: true });
    const aspect = FORMAT_TO_ASPECT[plan.format] || '3:4';

    for (let i = 0; i < total; i++) {
      const panel = panels[i]!;
      sse({
        type: 'image_progress',
        panelId: panel.id,
        index: i,
        total,
        stage: `generating panel ${i + 1}/${total}: ${panel.imagePrompt.slice(0, 60)}...`,
      });

      try {
        const images = await generateImage({
          prompt: panel.imagePrompt,
          ...(panel.negativePrompt ? { negativePrompt: panel.negativePrompt } : {}),
          aspectRatio: aspect,
          style: plan.style,
          creds,
        });
        if (images.length > 0) {
          const assetId = `comic-${panel.id}-0`;
          const imgPath = join(imgDir, `${assetId}.png`);
          await writeFile(imgPath, images[0]!.bytes);
          panel.generatedImageAssetId = assetId;
        }
        sse({ type: 'image_done', panelId: panel.id, index: i, total });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sse({ type: 'image_error', panelId: panel.id, index: i, total, message: msg });
      }
    }

    await ctx.planStore.writeComicBookPlan(projectId, plan);
    await renderComicPreviewHtml(projectId, ctx.projects, plan);
    sse({
      type: 'images_all_done',
      plan,
      totalGenerated: panels.filter((p) => p.generatedImageAssetId).length,
      total,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[comic:generate-all-images] ${msg}\n`);
    sse({ type: 'images_failed', message: msg });
  }
  res.end();
}

// =============================================================================
// 7. Preview HTML
// =============================================================================

export async function handleComicPreview(
  projectId: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  const plan = await ctx.planStore.readComicBookPlan(projectId);
  if (!plan) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'No comic book plan' }));
    return;
  }
  const projectDir = await ctx.projects.ensureDir(projectId);
  const htmlPath = join(projectDir, 'comic', 'preview.html');
  if (!existsSync(htmlPath)) {
    await renderComicPreviewHtml(projectId, ctx.projects, plan);
  }
  const html = await readFile(htmlPath, 'utf8');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

// =============================================================================
// 8. Exports
// =============================================================================

export async function handleComicExportPdf(
  projectId: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  const plan = await ctx.planStore.readComicBookPlan(projectId);
  if (!plan) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'No comic book plan' }));
    return;
  }
  const htmlPath = await renderComicPreviewHtml(projectId, ctx.projects, plan);
  const projectDir = await ctx.projects.ensureDir(projectId);
  const outputPath = join(projectDir, 'comic', `${sanitizeFilename(plan.title)}.pdf`);

  try {
    await htmlToPdf(htmlPath, outputPath);
    const project = await ctx.projects.load(projectId);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, outputPath, project }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const project = await ctx.projects.load(projectId);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        htmlPath,
        project,
        warning: `PDF renderer unavailable (${msg}) — HTML preview is available at /api/projects/${projectId}/comic/preview`,
      }),
    );
  }
}

export async function handleComicExportPng(
  projectId: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  const plan = await ctx.planStore.readComicBookPlan(projectId);
  if (!plan) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'No comic book plan' }));
    return;
  }
  const projectDir = await ctx.projects.ensureDir(projectId);
  const pngDir = join(projectDir, 'comic', 'png-pages');
  await mkdir(pngDir, { recursive: true });
  const files: string[] = [];
  const imgDir = join(projectDir, 'comic', 'images');

  for (const page of plan.pages.slice().sort((a, b) => a.order - b.order)) {
    const panelImgs = page.panels
      .filter((p) => p.generatedImageAssetId)
      .map((p) => join(imgDir, `${p.generatedImageAssetId}.png`));
    if (panelImgs.length > 0) {
      const pagePath = join(pngDir, `page-${String(page.order).padStart(2, '0')}.png`);
      const first = panelImgs[0]!;
      if (existsSync(first)) {
        copyFileSync(first, pagePath);
        files.push(pagePath);
      }
    }
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true, files, pageCount: files.length }));
}

export async function handleComicExportWebtoon(
  projectId: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  const plan = await ctx.planStore.readComicBookPlan(projectId);
  if (!plan) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'No comic book plan' }));
    return;
  }
  const projectDir = await ctx.projects.ensureDir(projectId);
  const panels = plan.pages
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((p) => p.panels.slice().sort((a, b) => a.order - b.order));

  const panelsHtml = panels
    .map((panel) => {
      const imgHtml = panel.generatedImageAssetId
        ? `<img src="/preview/${projectId}/comic/images/${panel.generatedImageAssetId}.png" style="width:100%;display:block" />`
        : `<div style="min-height:200px;background:#16213e;display:grid;place-items:center;color:#666">Panel ${panel.order}</div>`;
      const letters = panel.lettering
        .map(
          (l) =>
            `<div style="padding:8px 12px;background:rgba(255,255,255,.9);color:#111;margin:4px 0;border-radius:6px;font-size:14px"><strong>${escapeHtml(plan.characters.find((c) => c.id === l.speakerCharacterId)?.name ?? '')}</strong>: ${escapeHtml(l.text)}</div>`,
        )
        .join('');
      return `<div style="margin-bottom:8px">${imgHtml}${letters}</div>`;
    })
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:8px;background:#1a1a2e;color:#e0e0e0;font-family:system-ui,sans-serif;max-width:800px;margin:0 auto}</style></head><body><h1 style="text-align:center;color:#fff;padding:16px;font-family:Georgia,serif">${escapeHtml(plan.title)}</h1><p style="text-align:center;color:#a0a0c0;font-style:italic;margin-bottom:24px">${escapeHtml(plan.logline)}</p>${panelsHtml}</body></html>`;

  const wtDir = join(projectDir, 'comic', 'webtoon');
  await mkdir(wtDir, { recursive: true });
  const htmlPath = join(wtDir, 'webtoon.html');
  await writeFile(htmlPath, html, 'utf8');
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true, htmlPath, panelCount: panels.length }));
}

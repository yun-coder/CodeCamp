/**
 * Standalone HTTP server — wires routes together and serves the Vite dev
 * server in development. In production (`pnpm start`), it serves the built
 * static client from `dist/client/`.
 *
 * One process, one responsibility: route every comic-workflow request.
 *   - /api/projects/*         → project CRUD
 *   - /api/projects/:id/comic/* → the 5-phase workflow endpoints
 *   - /preview/:pid/comic/images/:asset.png  → static panel image serving
 *   - /api/config/minimax     → "is the key configured?" banner
 *
 * Listens on COMIC_STUDIO_PORT (default 5174) — Vite dev server proxies
 * /api and /preview to it on port 5173.
 */

import { createServer, type ServerResponse } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectStore } from './project-store.js';
import { ComicPlanStore } from './comic-plan-store.js';
import type { ServerContext } from './context.js';
import {
  handleComicPlanGet,
  handleComicPlanPost,
  handleComicGenerateStory,
  handleComicGeneratePanels,
  handleComicGenerateSingleImage,
  handleComicGenerateAllImages,
  handleComicPreview,
  handleComicExportPdf,
  handleComicExportPng,
  handleComicExportWebtoon,
} from './routes/comic.js';
import {
  handleListProjects,
  handleCreateProject,
  handleGetProject,
  handleDeleteProject,
  handleGetMessages,
  handleMinimaxConfig,
} from './routes/projects.js';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
};

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function serveStaticFile(
  res: ServerResponse,
  absPath: string,
): Promise<boolean> {
  if (!existsSync(absPath)) return false;
  const mime = MIME[extname(absPath).toLowerCase()] ?? 'application/octet-stream';
  const data = await readFile(absPath);
  res.writeHead(200, { 'content-type': mime });
  res.end(data);
  return true;
}

interface StartOptions {
  dataRoot: string;
  port: number;
  /** Absolute path to dist/client (production static). Undefined = dev mode. */
  staticDir?: string;
}

export interface ServerHandle {
  url: string;
  port: number;
  close: () => void;
}

export async function startServer(opts: StartOptions): Promise<ServerHandle> {
  const projects = new ProjectStore(opts.dataRoot);
  const planStore = new ComicPlanStore(projects);
  const ctx: ServerContext = { dataRoot: opts.dataRoot, projects, planStore };

  const server = createServer(async (req, res) => {
    try {
      if (!req.url) {
        res.writeHead(400);
        res.end();
        return;
      }
      const url = new URL(req.url, 'http://x');
      const m = req.method ?? 'GET';

      // ===== API: projects =====
      if (url.pathname === '/api/projects' && m === 'GET') {
        return handleListProjects(req, res, ctx);
      }
      if (url.pathname === '/api/projects' && m === 'POST') {
        return handleCreateProject(req, res, ctx);
      }

      const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
      if (projectMatch && projectMatch[1] && m === 'GET') {
        return handleGetProject(projectMatch[1], req, res, ctx);
      }
      if (projectMatch && projectMatch[1] && m === 'DELETE') {
        return handleDeleteProject(projectMatch[1], req, res, ctx);
      }

      // ===== API: project messages (stub) =====
      const msgsMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/messages$/);
      if (msgsMatch && msgsMatch[1] && m === 'GET') {
        return handleGetMessages(msgsMatch[1], req, res);
      }

      // ===== API: config probe =====
      if (url.pathname === '/api/config/minimax' && m === 'GET') {
        return handleMinimaxConfig(req, res);
      }

      // ===== API: comic plan =====
      const planMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/comic\/plan$/);
      if (planMatch && planMatch[1] && m === 'GET') {
        return handleComicPlanGet(planMatch[1], res, ctx);
      }
      if (planMatch && planMatch[1] && m === 'POST') {
        return handleComicPlanPost(planMatch[1], req, res, ctx);
      }

      // ===== API: comic generation (SSE) =====
      const storyMatch = url.pathname.match(
        /^\/api\/projects\/([^/]+)\/comic\/generate-story$/,
      );
      if (storyMatch && storyMatch[1] && m === 'POST') {
        return handleComicGenerateStory(storyMatch[1], req, res, ctx);
      }
      const panelsMatch = url.pathname.match(
        /^\/api\/projects\/([^/]+)\/comic\/generate-panels$/,
      );
      if (panelsMatch && panelsMatch[1] && m === 'POST') {
        return handleComicGeneratePanels(panelsMatch[1], req, res, ctx);
      }
      const oneImgMatch = url.pathname.match(
        /^\/api\/projects\/([^/]+)\/comic\/generate-image\/([^/]+)$/,
      );
      if (oneImgMatch && oneImgMatch[1] && oneImgMatch[2] && m === 'POST') {
        return handleComicGenerateSingleImage(oneImgMatch[1], oneImgMatch[2], req, res, ctx);
      }
      const allImgMatch = url.pathname.match(
        /^\/api\/projects\/([^/]+)\/comic\/generate-all-images$/,
      );
      if (allImgMatch && allImgMatch[1] && m === 'POST') {
        return handleComicGenerateAllImages(allImgMatch[1], req, res, ctx);
      }

      // ===== API: comic preview =====
      const previewMatch = url.pathname.match(
        /^\/api\/projects\/([^/]+)\/comic\/preview$/,
      );
      if (previewMatch && previewMatch[1] && m === 'GET') {
        return handleComicPreview(previewMatch[1], req, res, ctx);
      }

      // ===== API: comic export =====
      const pdfMatch = url.pathname.match(
        /^\/api\/projects\/([^/]+)\/comic\/export\/pdf$/,
      );
      if (pdfMatch && pdfMatch[1] && m === 'POST') {
        return handleComicExportPdf(pdfMatch[1], req, res, ctx);
      }
      const pngMatch = url.pathname.match(
        /^\/api\/projects\/([^/]+)\/comic\/export\/png$/,
      );
      if (pngMatch && pngMatch[1] && m === 'POST') {
        return handleComicExportPng(pngMatch[1], req, res, ctx);
      }
      const webtoonMatch = url.pathname.match(
        /^\/api\/projects\/([^/]+)\/comic\/export\/webtoon$/,
      );
      if (webtoonMatch && webtoonMatch[1] && m === 'POST') {
        return handleComicExportWebtoon(webtoonMatch[1], req, res, ctx);
      }

      // ===== Static preview asset serving =====
      // /preview/:pid/comic/images/:asset.png
      const imgMatch = url.pathname.match(
        /^\/preview\/([^/]+)\/comic\/images\/([^/]+)$/,
      );
      if (imgMatch && imgMatch[1] && imgMatch[2]) {
        const absPath = join(
          opts.dataRoot,
          '.comic-studio',
          'projects',
          imgMatch[1],
          'comic',
          'images',
          imgMatch[2],
        );
        if (await serveStaticFile(res, absPath)) return;
        return json(res, 404, { error: 'image not found' });
      }

      // ===== Production static client =====
      if (opts.staticDir) {
        const urlPath = url.pathname === '/' ? '/index.html' : url.pathname;
        const absPath = resolve(opts.staticDir, '.' + urlPath);
        if (!absPath.startsWith(opts.staticDir)) {
          res.writeHead(403);
          res.end();
          return;
        }
        if (await serveStaticFile(res, absPath)) return;
        // SPA fallback
        const indexPath = join(opts.staticDir, 'index.html');
        if (existsSync(indexPath)) {
          const html = await readFile(indexPath, 'utf8');
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          res.end(html);
          return;
        }
      }

      json(res, 404, { error: `Not found: ${m} ${url.pathname}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[server] ${msg}\n${err instanceof Error ? err.stack : ''}\n`);
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: msg }));
      } else {
        res.end();
      }
    }
  });

  await new Promise<void>((resolveFn) => server.listen(opts.port, '127.0.0.1', () => resolveFn()));
  return {
    url: `http://127.0.0.1:${opts.port}`,
    port: opts.port,
    close: () => server.close(),
  };
}

// ============================================================================
// Entry point — `node --import tsx/esm src/server/index.ts`
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.COMIC_STUDIO_PORT ?? 5174);
const dataRoot = process.env.COMIC_STUDIO_DATA_ROOT ?? process.cwd();
// In production, serve the built client. In dev, Vite handles the UI on 5173.
const distClient = resolve(__dirname, '..', '..', 'client');
const staticDir = existsSync(distClient) ? distClient : undefined;

startServer({ dataRoot, port: PORT, ...(staticDir ? { staticDir } : {}) }).then((handle) => {
  process.stdout.write(
    `\n  Comic Studio server\n  ───────────────────\n  API + static: ${handle.url}\n  Data root:    ${dataRoot}/.comic-studio/\n  Mode:         ${staticDir ? 'production' : 'development'}\n\n`,
  );
  if (!staticDir) {
    process.stdout.write(
      `  Start the UI in another terminal:  pnpm dev:client\n  (or set COMIC_STUDIO_PROD=1 and run: pnpm build:client first)\n\n`,
    );
  }
});

process.on('SIGINT', () => {
  process.stdout.write('\n  Shutting down…\n');
  process.exit(0);
});
process.on('SIGTERM', () => process.exit(0));

/**
 * Project CRUD + asset routes.
 *
 * Slightly trimmed from the parent monorepo's studio-server.ts — we only
 * need what the 5-phase workflow touches:
 *   - GET  /api/projects           list
 *   - POST /api/projects           create
 *   - GET  /api/projects/:id       load one
 *   - DELETE /api/projects/:id     remove
 *   - GET  /api/projects/:id/messages     (stub: returns [])
 *   - GET  /api/config/minimax     (for the "key configured?" banner)
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJsonBody } from '../http.js';
import { resolveMinimaxCredentials } from '../minimax.js';
import type { ServerContext } from '../context.js';

export async function handleListProjects(
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  const list = await ctx.projects.list();
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ projects: list }));
}

export async function handleCreateProject(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  const body = await readJsonBody(req);
  const name = (body.name as string) ?? 'Untitled';
  const project = await ctx.projects.create({ name });
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ project }));
}

export async function handleGetProject(
  projectId: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  try {
    const project = await ctx.projects.load(projectId);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ project }));
  } catch {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'project not found' }));
  }
}

export async function handleDeleteProject(
  projectId: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: ServerContext,
): Promise<void> {
  await ctx.projects.remove(projectId);
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
}

export async function handleGetMessages(
  _projectId: string,
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // Stub: v0.1 of comic-studio does not ship a full chat agent pipeline.
  // The right panel still loads, just with an empty history.
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ messages: [] }));
}

export async function handleMinimaxConfig(
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const creds = resolveMinimaxCredentials();
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ configured: !!creds }));
}

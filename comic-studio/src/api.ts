/**
 * studio-next — API client for the studio-server HTTP API.
 */

import type { ComicBookPlan, Project } from './types';

const BASE = '';

/** Extract a human-readable message from an error response body. */
async function errorBody(resp: Response): Promise<string> {
  const text = await resp.text().catch(() => '');
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    return parsed.error || parsed.message || text;
  } catch {
    return text.length > 200 ? text.slice(0, 200) + '...' : text;
  }
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { 'content-type': 'application/json', ...opts?.headers },
    ...opts,
  });
  if (!resp.ok) {
    const msg = await errorBody(resp);
    throw new Error(msg || `API ${opts?.method || 'GET'} ${path}: ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

/** Read an SSE stream, calling onEvent for each parsed event.
 *  Conforms to SSE spec: events are delimited by double-newline,
 *  and multi-line data fields are joined before parsing. */
export async function readSSE(
  path: string, body: unknown,
  onEvent: (ev: Record<string, unknown>) => void,
  signal?: AbortSignal,
): Promise<void> {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) {
    const msg = await errorBody(resp);
    throw new Error(msg || `SSE ${path}: ${resp.status}`);
  }
  const reader = resp.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // SSE events end with double-newline
    while (true) {
      const idx = buf.indexOf('\n\n');
      if (idx === -1) break;
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      // Collect all data: lines, joining multi-line payloads
      const dataLines: string[] = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('data: ')) {
          dataLines.push(line.slice(6));
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5));
        }
      }
      if (dataLines.length > 0) {
        const json = dataLines.join('\n');
        try { onEvent(JSON.parse(json)); }
        catch { /* skip malformed */ }
      }
    }
  }
  // Process any remaining data after stream ends (no trailing \n\n)
  if (buf.trim()) {
    const dataLines: string[] = [];
    for (const line of buf.split('\n')) {
      if (line.startsWith('data: ')) {
        dataLines.push(line.slice(6));
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5));
      }
    }
    if (dataLines.length > 0) {
      const json = dataLines.join('\n');
      try { onEvent(JSON.parse(json)); }
      catch { /* skip malformed */ }
    }
  }
}

// Projects
export async function listProjects(): Promise<Project[]> {
  return request<{ projects: Project[] }>('/api/projects').then((r) => r.projects);
}
export async function createProject(name: string): Promise<Project> {
  return request<{ project: Project }>('/api/projects', {
    method: 'POST', body: JSON.stringify({ name }),
  }).then((r) => r.project);
}
export async function getProject(id: string): Promise<Project> {
  return request<{ project: Project }>(`/api/projects/${id}`).then((r) => r.project);
}
export async function deleteProject(id: string): Promise<void> {
  await request(`/api/projects/${id}`, { method: 'DELETE' });
}

// Comic plan
export async function getComicPlan(projectId: string): Promise<ComicBookPlan | null> {
  return request<{ plan: ComicBookPlan | null }>(`/api/projects/${projectId}/comic/plan`).then((r) => r.plan);
}
export async function saveComicPlan(projectId: string, plan: ComicBookPlan): Promise<Project> {
  return request<{ project: Project }>(`/api/projects/${projectId}/comic/plan`, {
    method: 'POST', body: JSON.stringify({ plan }),
  }).then((r) => r.project);
}

// SSE generation
export function generateStory(
  projectId: string, idea: string, style: string, audience: string,
  language: string, pageCount: number, format: string,
  onEvent: (ev: Record<string, unknown>) => void, signal?: AbortSignal,
) { return readSSE(`/api/projects/${projectId}/comic/generate-story`, { idea, style, audience, language, pageCount, format }, onEvent, signal); }

export function generatePanels(
  projectId: string,
  onEvent: (ev: Record<string, unknown>) => void, signal?: AbortSignal,
) { return readSSE(`/api/projects/${projectId}/comic/generate-panels`, {}, onEvent, signal); }

export function generateAllImages(
  projectId: string,
  onEvent: (ev: Record<string, unknown>) => void, signal?: AbortSignal,
) { return readSSE(`/api/projects/${projectId}/comic/generate-all-images`, {}, onEvent, signal); }

export async function generateSingleImage(projectId: string, panelId: string) {
  return request(`/api/projects/${projectId}/comic/generate-image/${panelId}`, { method: 'POST' });
}

// Preview & Export
export function getComicPreviewUrl(projectId: string): string {
  return `${BASE}/api/projects/${projectId}/comic/preview`;
}
export async function exportComicPdf(projectId: string) {
  return request(`/api/projects/${projectId}/comic/export/pdf`, { method: 'POST' });
}
export async function exportComicPng(projectId: string) {
  return request(`/api/projects/${projectId}/comic/export/png`, { method: 'POST' });
}
export async function exportComicWebtoon(projectId: string) {
  return request(`/api/projects/${projectId}/comic/export/webtoon`, { method: 'POST' });
}

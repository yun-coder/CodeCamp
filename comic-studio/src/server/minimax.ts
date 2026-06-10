/**
 * MiniMax API client — image generation only.
 *
 * Originally from @video-pipeline/core → minimax.ts. The audio (TTS, music)
 * and helper functions are intentionally not included; this project only
 * uses the image_generation endpoint to render comic panels.
 *
 * Credentials precedence:
 *   apiKey:  COMIC_STUDIO_MINIMAX_API_KEY → OD_MINIMAX_API_KEY → MINIMAX_API_KEY
 *   baseUrl: COMIC_STUDIO_MINIMAX_BASE_URL → OD_MINIMAX_BASE_URL → MINIMAX_BASE_URL → default
 */

import { ComicStudioError } from './errors.js';

const MINIMAX_DEFAULT_BASE_URL = 'https://api.minimaxi.com/v1';
const MINIMAX_REQUEST_TIMEOUT_MS = 120_000;
const MINIMAX_IMAGE_MODEL = 'image-01';

export interface MinimaxCredentials {
  apiKey: string;
  baseUrl: string;
}

export interface GenerateImageOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
  imageCount?: number;
  style?: string;
  creds: MinimaxCredentials;
  signal?: AbortSignal;
}

export interface GeneratedImage {
  /** Image bytes (PNG). */
  bytes: Buffer;
  /** URL from the API response (may expire). */
  url: string;
}

/** Resolve MiniMax credentials from env. Returns null if no key is set. */
export function resolveMinimaxCredentials(
  env: NodeJS.ProcessEnv = process.env,
): MinimaxCredentials | null {
  const apiKey = (
    env.COMIC_STUDIO_MINIMAX_API_KEY ||
    env.OD_MINIMAX_API_KEY ||
    env.MINIMAX_API_KEY ||
    ''
  ).trim();
  if (!apiKey) return null;
  const baseUrl = (
    env.COMIC_STUDIO_MINIMAX_BASE_URL ||
    env.OD_MINIMAX_BASE_URL ||
    env.MINIMAX_BASE_URL ||
    MINIMAX_DEFAULT_BASE_URL
  )
    .trim()
    .replace(/\/$/, '');
  return { apiKey, baseUrl };
}

export async function generateImage(
  opts: GenerateImageOptions,
): Promise<GeneratedImage[]> {
  const prompt = (opts.prompt || '').trim();
  if (!prompt) {
    throw new ComicStudioError('invalid-input', 'image prompt is empty');
  }

  const body = {
    model: MINIMAX_IMAGE_MODEL,
    prompt,
    ...(opts.negativePrompt ? { negative_prompt: opts.negativePrompt } : {}),
    aspect_ratio: opts.aspectRatio ?? '3:4',
    n: opts.imageCount ?? 1,
    response_format: 'url',
  };

  const resp = await postJson<{
    data?: { image_urls?: string[] };
    base_resp?: { status_code?: number; status_msg?: string };
  }>('image_generation', body, opts.creds, 'image', opts.signal);

  const urls = resp.data?.image_urls;
  if (!urls || urls.length === 0) {
    throw new ComicStudioError('render-failed', 'minimax image generation returned no images');
  }

  const results: GeneratedImage[] = [];
  for (const url of urls) {
    let imgResp: Response;
    try {
      imgResp = await fetch(url, { signal: opts.signal });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new ComicStudioError('render-failed', `minimax image download failed: ${msg}`);
    }
    if (!imgResp.ok) {
      throw new ComicStudioError(
        'render-failed',
        `minimax image download ${imgResp.status}: ${imgResp.statusText}`,
      );
    }
    const bytes = Buffer.from(await imgResp.arrayBuffer());
    results.push({ bytes, url });
  }
  return results;
}

async function postJson<T>(
  endpoint: string,
  body: unknown,
  creds: MinimaxCredentials,
  label: string,
  signal?: AbortSignal,
): Promise<T> {
  const timeoutSignal = AbortSignal.timeout(MINIMAX_REQUEST_TIMEOUT_MS);
  // Node 20+ has AbortSignal.any; fall back to a no-op if missing.
  const effectiveSignal = signal
    ? (AbortSignal.any ? AbortSignal.any([signal, timeoutSignal]) : signal)
    : timeoutSignal;
  let resp: Response;
  try {
    resp = await fetch(`${creds.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${creds.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: effectiveSignal,
    });
  } catch (e) {
    const isTimeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    const msg = e instanceof Error ? e.message : String(e);
    throw new ComicStudioError(
      'render-failed',
      isTimeout
        ? `minimax ${label} timed out after ${Math.round(MINIMAX_REQUEST_TIMEOUT_MS / 1000)}s`
        : `minimax ${label} request failed: ${msg}`,
      true,
    );
  }

  const respText = await resp.text();
  if (!resp.ok) {
    throw new ComicStudioError(
      'render-failed',
      `minimax ${label} ${resp.status}: ${truncate(respText, 240)}`,
      resp.status >= 500,
    );
  }

  let data: T;
  try {
    data = JSON.parse(respText) as T;
  } catch {
    throw new ComicStudioError('render-failed', `minimax ${label} non-JSON: ${truncate(respText, 200)}`);
  }

  const envelope = (data as Record<string, unknown>).base_resp as
    | { status_code?: number; status_msg?: string }
    | undefined;
  if (envelope && envelope.status_code !== 0) {
    const code = envelope.status_code;
    const hint = code === 1004 || code === 1008 ? ' (auth / insufficient balance)' : '';
    throw new ComicStudioError(
      'render-failed',
      `minimax ${label} api error ${code}: ${envelope.status_msg || 'unknown'}${hint}`,
    );
  }

  return data;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : '';
}

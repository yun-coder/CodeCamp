/**
 * @video-pipeline/core — MiniMax audio provider.
 *
 * MiniMax exposes speech (`/t2a_v2`) and music (`/music_generation`) under the
 * same host, the same Bearer key, and the same response shape — both wrap the
 * payload in a `base_resp` envelope and return the audio as a hex string in
 * `data.audio`. So one provider + one key covers both narration and music.
 *
 * The request/parse pattern is ported from open-design's `renderMinimaxTTS`
 * (apps/daemon/src/media.ts): fetch → Bearer → check `base_resp.status_code`
 * (an HTTP 200 can still be a logical failure) → `Buffer.from(hex, 'hex')`.
 *
 * Credentials are read from the environment so the studio works without any
 * config file; a missing key yields `null` from {@link resolveMinimaxCredentials}
 * and callers report it gracefully instead of throwing.
 */

import { HtmlVideoError } from './errors.js';

/** Default base URL — current MiniMax API standard uses `api.minimaxi.com`.
 *  Override via OD_MINIMAX_BASE_URL when needed. */
const MINIMAX_DEFAULT_BASE_URL = 'https://api.minimaxi.com/v1';

/** Hard ceiling for a single MiniMax request. Music generation is slow but a
 *  request that hasn't returned in 2 minutes is hung, not slow. */
const MINIMAX_REQUEST_TIMEOUT_MS = 120_000;
/** Fast turbo speech tier (same default open-design ships). */
const MINIMAX_TTS_MODEL = 'speech-02-turbo';
/**
 * Music model. We use music-1.5, NOT the newer music-2.6 family: 2.6's
 * synchronous music_generation call never returns for our key (verified: 180s
 * with no response), whereas music-1.5 returns audio synchronously in ~50s.
 * Trade-off: 1.5 has no `is_instrumental` flag and REQUIRES a `lyrics` field,
 * so for instrumental soundtracks we pass a minimal humming placeholder.
 */
const MINIMAX_MUSIC_MODEL = 'music-1.5';

export interface MinimaxCredentials {
  apiKey: string;
  baseUrl: string;
}

export interface MinimaxAudioResult {
  /** Decoded audio bytes (MP3). */
  bytes: Buffer;
  /** File extension to store under. */
  ext: '.mp3';
  /** Human-readable note of what was produced (provider · model · size). */
  providerNote: string;
  /** Reported duration in seconds, if the API surfaced it. */
  durationSec?: number;
}

/**
 * Resolve MiniMax credentials from the environment. Returns `null` (not throw)
 * when no key is set, so the studio can show a friendly "configure your key"
 * message instead of a 500.
 *
 * Key precedence:  OD_MINIMAX_API_KEY → MINIMAX_API_KEY
 * Base precedence: OD_MINIMAX_BASE_URL → MINIMAX_BASE_URL → default
 */
export function resolveMinimaxCredentials(
  env: NodeJS.ProcessEnv = process.env,
): MinimaxCredentials | null {
  const apiKey = (env.OD_MINIMAX_API_KEY || env.MINIMAX_API_KEY || '').trim();
  if (!apiKey) return null;
  const baseUrl = (env.OD_MINIMAX_BASE_URL || env.MINIMAX_BASE_URL || MINIMAX_DEFAULT_BASE_URL)
    .trim()
    .replace(/\/$/, '');
  return { apiKey, baseUrl };
}

/**
 * Shared POST + decode for both MiniMax audio endpoints. Throws
 * HtmlVideoError('render-failed', …) on transport / API / decode failure.
 */
async function postAndDecode(
  endpoint: string,
  body: unknown,
  creds: MinimaxCredentials,
  label: string,
  signal?: AbortSignal,
): Promise<{ bytes: Buffer; extraInfo: Record<string, unknown> }> {
  // MiniMax generation (esp. music) can take tens of seconds, but it must NOT
  // hang forever — an unbounded fetch leaves the studio's SSE stream stuck on
  // "generating…" with no failure event, which reads to the user as "the button
  // does nothing". Cap it; if the caller passed its own signal, respect that.
  const timeoutSignal = AbortSignal.timeout(MINIMAX_REQUEST_TIMEOUT_MS);
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
    throw new HtmlVideoError(
      'render-failed',
      isTimeout
        ? `minimax ${label} timed out after ${Math.round(MINIMAX_REQUEST_TIMEOUT_MS / 1000)}s (the API did not respond — try again, or check OD_MINIMAX_BASE_URL)`
        : `minimax ${label} request failed: ${msg} (check OD_MINIMAX_BASE_URL — default is api.minimaxi.chat)`,
      true,
    );
  }

  const respText = await resp.text();
  if (!resp.ok) {
    throw new HtmlVideoError(
      'render-failed',
      `minimax ${label} ${resp.status}: ${truncate(respText, 240)}`,
      resp.status >= 500,
    );
  }

  let data: {
    base_resp?: { status_code?: number; status_msg?: string };
    data?: { audio?: unknown };
    extra_info?: Record<string, unknown>;
  };
  try {
    data = JSON.parse(respText);
  } catch {
    throw new HtmlVideoError('render-failed', `minimax ${label} non-JSON: ${truncate(respText, 200)}`);
  }

  // MiniMax wraps every response in base_resp; an HTTP 200 can still be a
  // logical failure (auth / params), surfaced via a non-zero status_code.
  if (data.base_resp && data.base_resp.status_code !== 0) {
    const code = data.base_resp.status_code;
    const hint = code === 1004 || code === 1008 ? ' (auth / insufficient balance — check the API key)' : '';
    throw new HtmlVideoError(
      'render-failed',
      `minimax ${label} api error ${code}: ${data.base_resp.status_msg || 'unknown'}${hint}`,
    );
  }

  const hex = data.data?.audio;
  if (typeof hex !== 'string' || !hex) {
    throw new HtmlVideoError('render-failed', `minimax ${label} response missing data.audio`);
  }
  const bytes = Buffer.from(hex, 'hex');
  if (bytes.length === 0) {
    throw new HtmlVideoError('render-failed', `minimax ${label} decoded zero bytes`);
  }
  return { bytes, extraInfo: data.extra_info ?? {} };
}

/**
 * Generate spoken narration via MiniMax TTS (`/t2a_v2`).
 * Defaults to a neutral Mandarin male voice that reads both zh + en well.
 */
export async function generateTts(opts: {
  text: string;
  voiceId?: string;
  languageBoost?: string;
  speed?: number;
  vol?: number;
  pitch?: number;
  creds: MinimaxCredentials;
  signal?: AbortSignal;
}): Promise<MinimaxAudioResult> {
  const text = (opts.text || '').trim();
  if (!text) {
    throw new HtmlVideoError('invalid-input', 'narration text is empty');
  }
  const voiceId = (opts.voiceId || '').trim() || 'male-qn-qingse';
  const languageBoost = (opts.languageBoost || '').trim();

  const body = {
    model: MINIMAX_TTS_MODEL,
    text,
    stream: false,
    ...(languageBoost ? { language_boost: languageBoost } : {}),
    voice_setting: {
      voice_id: voiceId,
      speed: opts.speed ?? 1.0,
      vol: opts.vol ?? 1.0,
      pitch: opts.pitch ?? 0,
    },
    audio_setting: { sample_rate: 32000, format: 'mp3' },
  };

  const { bytes, extraInfo } = await postAndDecode('t2a_v2', body, opts.creds, 'tts', opts.signal);
  const audioLen = typeof extraInfo.audio_length === 'number' ? extraInfo.audio_length : undefined;
  const durationSec = audioLen ? Math.round(audioLen / 100) / 10 : undefined;
  return {
    bytes,
    ext: '.mp3',
    providerNote: `minimax/${MINIMAX_TTS_MODEL} · ${voiceId} · ${durationSec ?? '?'}s · ${bytes.length} bytes`,
    durationSec,
  };
}

/**
 * Generate background music via MiniMax (`/music_generation`).
 * Instrumental-only by default (a video soundtrack rarely wants vocals).
 */
export async function generateMusic(opts: {
  prompt: string;
  instrumental?: boolean;
  creds: MinimaxCredentials;
  signal?: AbortSignal;
}): Promise<MinimaxAudioResult> {
  const prompt = (opts.prompt || '').trim();
  if (!prompt) {
    throw new HtmlVideoError('invalid-input', 'music prompt is empty');
  }

  const instrumental = opts.instrumental ?? true;
  // music-1.5 requires a non-empty `lyrics` field and has no is_instrumental
  // flag. For an instrumental soundtrack we feed a minimal hummed placeholder
  // so the model produces a melody without foregrounded vocals; otherwise let
  // the prompt double as a loose lyrical brief.
  const lyrics = instrumental ? '[Intro]\nooh ooh\n[Hook]\nla la la' : prompt;
  const body = {
    model: MINIMAX_MUSIC_MODEL,
    prompt,
    lyrics,
    audio_setting: { sample_rate: 44100, bitrate: 256000, format: 'mp3' },
    output_format: 'hex',
  };

  const { bytes } = await postAndDecode('music_generation', body, opts.creds, 'music', opts.signal);
  return {
    bytes,
    ext: '.mp3',
    providerNote: `minimax/${MINIMAX_MUSIC_MODEL} · ${instrumental ? 'instrumental' : 'with-vocals'} · ${bytes.length} bytes`,
  };
}

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

/** MiniMax image generation model — image-01 is the current stable model. */
const MINIMAX_IMAGE_MODEL = 'image-01';

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

/**
 * Generate images via MiniMax image_generation API.
 *
 * Returns an array of GeneratedImage objects — one per generated image. Each
 * image is downloaded from the URL MiniMax returns so callers can store them
 * as project assets without worrying about URL expiry.
 */
export async function generateImage(
  opts: GenerateImageOptions,
): Promise<GeneratedImage[]> {
  const prompt = (opts.prompt || '').trim();
  if (!prompt) {
    throw new HtmlVideoError('invalid-input', 'image prompt is empty');
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
  }>(
    'image_generation',
    body,
    opts.creds,
    'image',
    opts.signal,
  );

  const urls = resp.data?.image_urls;
  if (!urls || urls.length === 0) {
    throw new HtmlVideoError('render-failed', 'minimax image generation returned no images');
  }

  // Download each image so callers get persistent bytes.
  const results: GeneratedImage[] = [];
  for (const url of urls) {
    let imgResp: Response;
    try {
      imgResp = await fetch(url, { signal: opts.signal });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new HtmlVideoError('render-failed', `minimax image download failed: ${msg}`);
    }
    if (!imgResp.ok) {
      throw new HtmlVideoError(
        'render-failed',
        `minimax image download ${imgResp.status}: ${imgResp.statusText}`,
      );
    }
    const bytes = Buffer.from(await imgResp.arrayBuffer());
    results.push({ bytes, url });
  }

  return results;
}

/**
 * POST + JSON-parse for MiniMax non-audio endpoints (e.g. image_generation
 * which returns JSON with URLs instead of hex audio).
 */
async function postJson<T>(
  endpoint: string,
  body: unknown,
  creds: MinimaxCredentials,
  label: string,
  signal?: AbortSignal,
): Promise<T> {
  const timeoutSignal = AbortSignal.timeout(MINIMAX_REQUEST_TIMEOUT_MS);
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
    throw new HtmlVideoError(
      'render-failed',
      isTimeout
        ? `minimax ${label} timed out after ${Math.round(MINIMAX_REQUEST_TIMEOUT_MS / 1000)}s`
        : `minimax ${label} request failed: ${msg}`,
      true,
    );
  }

  const respText = await resp.text();
  if (!resp.ok) {
    throw new HtmlVideoError(
      'render-failed',
      `minimax ${label} ${resp.status}: ${truncate(respText, 240)}`,
      resp.status >= 500,
    );
  }

  let data: T;
  try {
    data = JSON.parse(respText) as T;
  } catch {
    throw new HtmlVideoError('render-failed', `minimax ${label} non-JSON: ${truncate(respText, 200)}`);
  }

  // Check base_resp envelope
  const envelope = (data as Record<string, unknown>).base_resp as
    | { status_code?: number; status_msg?: string }
    | undefined;
  if (envelope && envelope.status_code !== 0) {
    const code = envelope.status_code;
    const hint = code === 1004 || code === 1008 ? ' (auth / insufficient balance)' : '';
    throw new HtmlVideoError(
      'render-failed',
      `minimax ${label} api error ${code}: ${envelope.status_msg || 'unknown'}${hint}`,
    );
  }

  return data;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

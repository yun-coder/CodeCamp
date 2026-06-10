/**
 * Minimal agent runtime — Claude-Code-only.
 *
 * The parent monorepo ships 13 agent adapters (claude, codex, hermes, AMR,
 * copilot, aider, …). The comic workflow only needs JSON-validating,
 * text-emitting agent calls for two prompt steps (story bible, panel list),
 * so we ship a single adapter that shells out to `claude --print`. If a
 * user wants a different agent, they can add it here.
 *
 * Stream events are normalized to {type:'text'|'error'|'done'} so handlers
 * don't care which agent was used.
 */

import { spawn } from 'node:child_process';

export type AgentEvent =
  | { type: 'text'; chunk: string }
  | { type: 'error'; message: string }
  | { type: 'done'; exitCode: number };

export interface SpawnOptions {
  prompt: string;
  cwd?: string;
  model?: string | null;
  signal?: AbortSignal;
  onEvent: (ev: AgentEvent) => void;
}

export interface SpawnHandle {
  done: Promise<{ exitCode: number }>;
}

interface AgentDef {
  id: string;
  label: string;
  /** Spawn the agent CLI; return a handle whose `done` promise resolves when
   *  the agent process exits. `onEvent` receives normalized events. */
  spawn: (opts: SpawnOptions) => SpawnHandle;
  /** Cheap availability check — does the binary exist on PATH? */
  isAvailable: () => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// claude — `claude --print --output-format text "<prompt>"`
// ---------------------------------------------------------------------------

const claudeAgent: AgentDef = {
  id: 'claude',
  label: 'Claude Code',
  isAvailable: async () => {
    try {
      const { spawn: sp } = await import('node:child_process');
      return await new Promise<boolean>((resolveFn) => {
        const p = sp('claude', ['--version'], { stdio: 'ignore' });
        p.on('error', () => resolveFn(false));
        p.on('exit', (code) => resolveFn(code === 0));
      });
    } catch {
      return false;
    }
  },
  spawn: (opts: SpawnOptions): SpawnHandle => {
    const args = [
      '--print',
      '--output-format',
      'text',
      ...(opts.model ? ['--model', opts.model] : []),
      opts.prompt,
    ];
    const child = spawn('claude', args, {
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      signal: opts.signal,
    });
    let buf = '';
    child.stdout.on('data', (chunk: Buffer) => {
      const s = chunk.toString('utf8');
      buf += s;
      opts.onEvent({ type: 'text', chunk: s });
    });
    let stderrBuf = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      opts.onEvent({ type: 'error', message: err.message });
    });
    const done = new Promise<{ exitCode: number }>((resolveFn) => {
      child.on('exit', (code) => {
        if (code !== 0 && stderrBuf.trim()) {
          opts.onEvent({ type: 'error', message: stderrBuf.slice(-400) });
        }
        resolveFn({ exitCode: code ?? 0 });
      });
    });
    return { done };
  },
};

// ---------------------------------------------------------------------------
// Stub fallback — emits a deterministic placeholder. Useful for offline
// development and for the smoke test. Activated when claude is unavailable
// AND the user has explicitly enabled stubs via env (no surprise writes).
// ---------------------------------------------------------------------------

const stubAgent: AgentDef = {
  id: 'stub',
  label: 'Stub (offline)',
  isAvailable: async () => true,
  spawn: (opts: SpawnOptions): SpawnHandle => {
    const out = buildStubResponse(opts.prompt);
    // Stream a chunked mock so the SSE event path is exercised.
    const chunks: string[] = [];
    for (let i = 0; i < out.length; i += 80) {
      chunks.push(out.slice(i, i + 80));
    }
    if (chunks.length === 0) chunks.push(out);
    let i = 0;
    const tick = () => {
      if (i >= chunks.length) {
        opts.onEvent({ type: 'done', exitCode: 0 });
        return;
      }
      opts.onEvent({ type: 'text', chunk: chunks[i]! });
      i += 1;
      setTimeout(tick, 30);
    };
    const done = new Promise<{ exitCode: number }>((resolveFn) => {
      // Resolve once the synthetic stream is done.
      const start = Date.now();
      const poll = setInterval(() => {
        if (i >= chunks.length) {
          clearInterval(poll);
          resolveFn({ exitCode: 0 });
        } else if (Date.now() - start > 30_000) {
          clearInterval(poll);
          resolveFn({ exitCode: 0 });
        }
      }, 100);
    });
    setTimeout(tick, 10);
    return { done };
  },
};

function buildStubResponse(prompt: string): string {
  // Detect which phase we're in by prompt shape.
  if (prompt.includes('comic novel planner') || prompt.includes('character designer')) {
    return JSON.stringify(
      {
        title: '示例漫画图集 (Stub)',
        logline: '一个通过 stub agent 生成的占位故事。',
        synopsis: '本故事由本地 stub agent 生成,用于在没有配置真实 agent 的情况下验证工作流。',
        characters: [
          {
            id: 'char-1',
            name: '主角',
            role: 'protagonist',
            personality: '勇敢、好奇、富有同理心。',
            visual: {
              description: '一位 16 岁少女,黑色短发,翠绿色眼睛,穿着深蓝色校服外套。',
              palette: ['#1f3a93', '#f1c40f', '#e74c3c', '#ffffff'],
              negativePrompt: 'missing limbs, extra fingers',
            },
          },
          {
            id: 'char-2',
            name: '神秘信使',
            role: 'supporting',
            personality: '神秘、低语、总是戴着手套。',
            visual: {
              description: '一位瘦高的成年人,深色斗篷,银色长发,苍白的面容。',
              palette: ['#2c3e50', '#95a5a6', '#8e44ad', '#ecf0f1'],
              negativePrompt: 'missing limbs, extra fingers',
            },
          },
        ],
      },
      null,
      2,
    );
  }
  if (prompt.includes('manga/comic novel art director') || prompt.includes('image collection plan')) {
    const pageCountMatch = prompt.match(/pageCount["'\s:]+(\d+)/);
    const pageCount = pageCountMatch ? Number(pageCountMatch[1]) : 8;
    const pages = Array.from({ length: pageCount }, (_, i) => {
      const pageId = `page-${i + 1}`;
      const panels = Array.from({ length: 4 }, (_, j) => ({
        id: `panel-${i + 1}-${j + 1}`,
        pageId,
        order: j + 1,
        shot: ['wide', 'medium', 'close-up', 'over-shoulder'][j] ?? 'medium',
        scene: `第 ${i + 1} 组场景 — ${j + 1} 号画面`,
        action: `角色在场景中活动,镜头${j + 1} 的动作。`,
        characters: ['char-1'],
        background: '现代都市街道,阴天,远处有高楼。',
        mood: '神秘而充满期待',
        imagePrompt: `A cinematic still illustration of a young woman with short black hair in a navy school uniform, scene ${i + 1} shot ${j + 1}, modern city street overcast, soft rim light, no text, no logos, color comic novel style.`,
        lettering: [
          {
            id: `txt-${i + 1}-${j + 1}-1`,
            kind: 'caption',
            text: `场景 ${i + 1} · 画面 ${j + 1}`,
          },
        ],
      }));
      return {
        id: pageId,
        order: i + 1,
        title: `第 ${i + 1} 组`,
        layout: 'four-panel-grid',
        summary: `本组讲述故事进展。`,
        panels,
      };
    });
    return JSON.stringify({ pages }, null, 2);
  }
  return JSON.stringify({ note: 'stub agent fallback' });
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const AGENTS: AgentDef[] = [claudeAgent, stubAgent];

export function findAgent(id: string): AgentDef | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function listAgents(): AgentDef[] {
  return AGENTS.slice();
}

export async function detectFirstAvailable(): Promise<AgentDef | undefined> {
  for (const a of AGENTS) {
    if (a.id === 'stub') continue; // only surface stub if explicitly forced
    if (await a.isAvailable()) return a;
  }
  if (process.env.COMIC_STUDIO_ALLOW_STUB === '1') return stubAgent;
  return undefined;
}

export type { AgentDef };

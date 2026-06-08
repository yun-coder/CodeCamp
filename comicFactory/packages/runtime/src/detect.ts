import { execFile, spawn as cpSpawn } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { promisify } from 'node:util';
import { AGENT_DEFS } from './registry.js';
import type { AgentDef, DetectedAgent } from './types.js';

const exec = promisify(execFile);

async function which(bin: string): Promise<string | null> {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await exec('where.exe', [bin], { timeout: 2000, windowsHide: true });
      const candidates = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      return preferWindowsExecutable(candidates);
    } catch {
      return null;
    }
  }

  try {
    const { stdout } = await exec('which', [bin], { timeout: 2000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

function preferWindowsExecutable(candidates: string[]): string | null {
  if (candidates.length === 0) return null;
  const runnable = candidates.find((p) => /\.(cmd|exe|bat)$/i.test(p));
  return runnable ?? candidates[0] ?? null;
}

function canRun(candidate: string): boolean {
  try {
    accessSync(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function quoteWindowsShellArg(value: string): string {
  return `"${value.replace(/(["^&|<>])/g, '^$1')}"`;
}

export async function resolveBin(def: AgentDef): Promise<string | null> {
  const onPath = await which(def.bin);
  if (onPath) return onPath;

  for (const candidate of def.binFallbacks ?? []) {
    if (canRun(candidate)) return candidate;
  }

  if (def.resolveBinFallback) {
    try {
      const resolved = await def.resolveBinFallback();
      if (resolved && canRun(resolved)) return resolved;
    } catch {
      // Resolver threw or path was not runnable; treat it as not found.
    }
  }

  return null;
}

async function probeVersion(bin: string, args: string[]): Promise<string | null> {
  return await new Promise((resolve) => {
    const command = [bin, ...args].map(quoteWindowsShellArg).join(' ');
    const child = process.platform === 'win32' ? cpSpawn(command, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: true,
    }) : cpSpawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
      resolve(null);
    }, 5000);
    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on('close', () => {
      clearTimeout(timer);
      const text = (stdout || stderr).trim();
      resolve(text.split('\n')[0] ?? null);
    });
  });
}

export async function detectOne(def: AgentDef): Promise<DetectedAgent> {
  if (def.kind === 'http') {
    const probe = def.httpProbe ? await def.httpProbe() : { available: false };
    return {
      id: def.id,
      name: def.name,
      bin: def.bin,
      available: probe.available,
      ...(probe.version !== undefined && { version: probe.version }),
      ...(def.installUrl !== undefined && { installUrl: def.installUrl }),
    };
  }

  const path = await resolveBin(def);
  if (!path) {
    return {
      id: def.id,
      name: def.name,
      bin: def.bin,
      available: false,
      ...(def.installUrl !== undefined && { installUrl: def.installUrl }),
    };
  }

  let version = await probeVersion(path, def.versionArgs);
  if (def.extraDetect) {
    const extra = await def.extraDetect(path);
    if (extra.version !== undefined && extra.version !== null) version = extra.version;
    return {
      id: def.id,
      name: def.name,
      bin: def.bin,
      available: extra.available,
      path,
      version,
      ...(extra.hint !== undefined && { hint: extra.hint }),
      ...(def.installUrl !== undefined && { installUrl: def.installUrl }),
    };
  }

  return {
    id: def.id,
    name: def.name,
    bin: def.bin,
    available: true,
    path,
    version,
    ...(def.installUrl !== undefined && { installUrl: def.installUrl }),
  };
}

const DETECT_TTL_MS = 5 * 60 * 1000;
let detectCache: { ts: number; result: DetectedAgent[] } | null = null;

export async function detectAll(opts?: { force?: boolean }): Promise<DetectedAgent[]> {
  const now = Date.now();
  if (!opts?.force && detectCache && now - detectCache.ts < DETECT_TTL_MS) {
    return detectCache.result;
  }
  const result = await Promise.all(AGENT_DEFS.map(detectOne));
  detectCache = { ts: now, result };
  return result;
}

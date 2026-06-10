/**
 * HTML → PDF export.
 *
 * Uses puppeteer-core and expects the caller to supply an executablePath
 * pointing at a Chromium / Chrome binary on the host. We do NOT auto-install
 * Chromium (that would be a 200MB surprise); we surface a clean error and
 * let the route handler downgrade to HTML-only export.
 *
 * Originally from @video-pipeline/cli/src/studio-server.ts → htmlToPdf, but
 * rewritten to use puppeteer-core with explicit binary resolution instead
 * of `npx puppeteer` (which downloads a private Chromium copy).
 */

import puppeteer, { type Browser } from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { ComicStudioError } from './errors.js';

const CANDIDATE_PATHS: Partial<Record<NodeJS.Platform, string[]>> = {
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ],
  aix: [],
  haiku: [],
  freebsd: [],
  openbsd: [],
  netbsd: [],
  sunos: [],
  cygwin: [],
};

export interface ChromeResolution {
  executablePath: string;
  source: 'env' | 'default' | 'platform-candidate' | 'puppeteer';
}

export function resolveChromeExecutable(): ChromeResolution | null {
  const fromEnv = process.env.COMIC_STUDIO_CHROME_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) {
    return { executablePath: fromEnv, source: 'env' };
  }
  const fromPuppeteer = (puppeteer as unknown as { executablePath?: () => string }).executablePath?.();
  if (fromPuppeteer && existsSync(fromPuppeteer)) {
    return { executablePath: fromPuppeteer, source: 'puppeteer' };
  }
  for (const candidate of CANDIDATE_PATHS[process.platform] ?? []) {
    if (existsSync(candidate)) return { executablePath: candidate, source: 'platform-candidate' };
  }
  return null;
}

export async function htmlToPdf(
  htmlPath: string,
  outputPath: string,
  opts: { executablePath?: string; timeoutMs?: number } = {},
): Promise<{ executablePath: string }> {
  const resolution = opts.executablePath
    ? { executablePath: opts.executablePath, source: 'env' as const }
    : resolveChromeExecutable();
  if (!resolution) {
    throw new ComicStudioError(
      'missing-config',
      'No Chrome/Chromium binary found. Set COMIC_STUDIO_CHROME_PATH or install Chrome/Edge.',
    );
  }
  const timeoutMs = opts.timeoutMs ?? 60_000;
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      executablePath: resolution.executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.goto('file://' + htmlPath.replace(/\\/g, '/'), {
      waitUntil: 'networkidle0',
      timeout: timeoutMs,
    });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
    });
    return { executablePath: resolution.executablePath };
  } finally {
    await browser?.close().catch(() => {});
  }
}

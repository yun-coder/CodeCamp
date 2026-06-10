/**
 * HTTP request body helpers.
 *
 * Lifted from the parent monorepo's studio-server.ts. Only the JSON reader
 * is exposed here; the multipart form reader was dropped because the comic
 * workflow does not need file uploads in v0.1.
 */

import type { IncomingMessage } from 'node:http';

export async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolveFn, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text) {
        resolveFn({});
        return;
      }
      try {
        resolveFn(JSON.parse(text) as Record<string, unknown>);
      } catch (e) {
        reject(new Error(`Invalid JSON body: ${e instanceof Error ? e.message : String(e)}`));
      }
    });
    req.on('error', reject);
  });
}

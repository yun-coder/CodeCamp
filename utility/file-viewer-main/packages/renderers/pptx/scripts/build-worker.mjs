import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  bundle: true,
  entryPoints: [resolve(packageDir, 'src/worker-entry.ts')],
  format: 'esm',
  minify: true,
  outfile: resolve(packageDir, 'dist/worker/pptx.worker.js'),
  platform: 'browser',
  target: ['es2019'],
});

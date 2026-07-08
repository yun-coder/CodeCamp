import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stylesDir = resolve(packageDir, 'dist/styles');

await mkdir(stylesDir, { recursive: true });
await copyFile(
  resolve(packageDir, 'src/styles/pptxjs.css'),
  resolve(stylesDir, 'pptxjs.css')
);

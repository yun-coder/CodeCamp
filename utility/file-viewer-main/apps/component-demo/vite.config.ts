import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const demoRoot = fileURLToPath(new URL('.', import.meta.url))
const excalidrawStub = resolve(demoRoot, '../../scripts/excalidraw-iife-stub.ts')

export default defineConfig({
  resolve: {
    alias: {
      // The component demo publishes script-tag and framework examples together.
      // Keep its production build independent from Excalidraw's React peers and
      // let core render .excalidraw through the built-in offline SVG fallback.
      '@excalidraw/excalidraw': excalidrawStub
    }
  },
  server: {
    host: '127.0.0.1'
  },
  preview: {
    host: '127.0.0.1'
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(demoRoot, 'index.html'),
        jquery: resolve(demoRoot, 'jquery.html'),
        'custom-element': resolve(demoRoot, 'custom-element.html'),
        'manual-js': resolve(demoRoot, 'manual-js.html'),
        'manual-iife': resolve(demoRoot, 'manual-iife.html'),
        'svelte-action': resolve(demoRoot, 'svelte-action.html'),
        vue3: resolve(demoRoot, 'vue3.html')
      }
    }
  }
})

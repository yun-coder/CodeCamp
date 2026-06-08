import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          markdown: ['marked', 'highlight.js'],
          icons: ['lucide-vue-next'],
          vue: ['vue'],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
})

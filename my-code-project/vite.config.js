import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'plugDemo',
      fileName: (format) => `plugDemo.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['vue', 'fabric'],
      output: {
        globals: {
          vue: 'Vue',
          fabric: 'fabric'
        }
      }
    }
  },
  server: {
    port: 8084,
    open: true,
    hmr: true
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      },
      less: {
        javascriptEnabled: true
      }
    }
  }
}))

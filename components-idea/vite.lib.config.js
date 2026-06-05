import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, './src/index.js'),
      name: 'CommonTool',
      fileName: (format) => `commons-tool.${format === 'es' ? 'es' : 'umd'}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'ant-design-vue', '@ant-design/icons-vue', 'vxe-pc-ui', 'vxe-table'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          pinia: 'Pinia',
          'ant-design-vue': 'Antd',
          '@ant-design/icons-vue': 'AntdIconsVue',
          'vxe-pc-ui': 'VxeUI',
          'vxe-table': 'VxeTable',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'style.css';
          }
          return '[name].[hash][extname]';
        },
      },
    },
    cssCodeSplit: false,
  },
});

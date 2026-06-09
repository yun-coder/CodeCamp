import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3072,
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://127.0.0.1:3071',
      '/preview': 'http://127.0.0.1:3071',
      '/template-asset': 'http://127.0.0.1:3071',
    },
  },
});

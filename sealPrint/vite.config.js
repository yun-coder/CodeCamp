import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import viteCompression from "vite-plugin-compression";
import path from "path";
import { createSvgIconsPlugin } from "vite-plugin-svg-icons";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    ViteImageOptimizer({
      enable: process.env.NODE_ENV === 'production',
      png: { quality: 80 },
      jpeg: { quality: 80 },
      webp: { lossless: false, quality: 80 },
    }),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false,
        }),
      ],
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240,
      deleteOriginFile: false,
    }),
    createSvgIconsPlugin({
      iconDirs: [path.resolve(process.cwd(), "./src/assets/icons")],
      symbolId: "icon-[name]",
      inject: "body-last",
      customDomId: "__svg__icons__dom__",
    }),
  ],
  base: "./",
  envPrefix: ["VITE"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@images": path.resolve(__dirname, "./src/assets/images"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@utils": path.resolve(__dirname, "./src/utils"),
    },
  },
  server: {
    host: true,
    port: 8881,
    https: false,
    open: true,
    cors: true,
    strictPort: true,
    proxy: {
      "/fpi": {
        target: "http://192.168.2.170:8082/pms",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fpi/, ""),
      },
    },
  },
  publicDir: false,
  // 打包配置
  build: {
    outDir: "dist",
    rollupOptions: {
      treeshake: false,
      external: ['vue', 'pinia', 'ant-design-vue', '@ant-design/icons-vue'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          pinia: 'Pinia',
          'ant-design-vue': 'Antd',
          '@ant-design/icons-vue': 'AntdIconsVue',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'css/[name][extname]';
          }
          // 插件文件保持原名
          if (assetInfo.name.includes('plugins')) {
            return 'plugins/[name][extname]';
          }
          return 'assets/[name].[hash][extname]';
        },
      },
    },
  },
});


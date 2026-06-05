import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import {AntDesignVueResolver} from 'unplugin-vue-components/resolvers';
import path from 'path';
import {createSvgIconsPlugin} from 'vite-plugin-svg-icons';
import {ViteImageOptimizer} from 'vite-plugin-image-optimizer';
import viteCompression from 'vite-plugin-compression';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import {FileSystemIconLoader} from 'unplugin-icons/loaders';

// 引入icons
const localIconPath = path.join(process.cwd(), 'src/assets/icons');
// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        Components({
            resolvers: [
                AntDesignVueResolver({
                    importStyle: false,
                }),
                IconsResolver({
                    prefix: 'icon',
                    customCollections: ['local'],
                }),
            ],
            dts: false,
        }),
        Icons({
            compiler: 'vue3',
            autoInstall: true,
            customCollections: {
                local: FileSystemIconLoader(localIconPath, (svg) =>
                    svg.replace(/^<svg\s/, '<svg class="svg-icon"')
                ),
            },
        }),
        ViteImageOptimizer({
            enable: process.env.NODE_ENV === 'production',
            png: {quality: 80},
            jpeg: {quality: 80},
            webp: {lossless: false, quality: 80},
        }),
        viteCompression({
            algorithm: 'gzip',
            ext: '.gz',
            threshold: 10240,
            deleteOriginFile: false,
        }),
        createSvgIconsPlugin({
            iconDirs: [path.resolve(process.cwd(), './src/assets/icons')],
            symbolId: 'icon-[name]',
            inject: 'body-last',
            customDomId: '__svg__icons__dom__',
        }),
    ],
    base: './',
    envPrefix: ['VITE'],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@images': path.resolve(__dirname, './src/assets/images'),
            '@components': path.resolve(__dirname, './src/components'),
            '@utils': path.resolve(__dirname, './src/utils'),
        },
    },
    server: {
        host: true,
        port: 8888,
        https: false,
        open: true,
        cors: true,
        strictPort: true,
        proxy: {
            '/fpi': {
                target: 'http://192.168.2.170:8082/pms',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/fpi/, ''),
            },
        },
    },
    publicDir: false, // 关闭vite默认的public目录
    // 打包配置
    build: {
        outDir: 'dist',
        lib: {
            entry: path.resolve(__dirname, './src/components/index.js'),
            name: 'CommonTool',
            fileName: (format) => `commons-tool.${format === 'es' ? 'es' : 'umd'}.js`,
            formats: ['es', 'umd']
        },
        rollupOptions: {
            treeshake: false,
            external: ['vue', 'pinia', 'ant-design-vue', '@ant-design/icons-vue'],
            output: {
                exports: 'named', // 禁用警告
                globals: {
                    vue: 'Vue',
                    pinia: 'Pinia',
                    'ant-design-vue': 'Antd',
                    '@ant-design/icons-vue': 'AntdIconsVue',
                },
                // 确保CSS文件被正确命名
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name.endsWith('.css')) {
                        return 'style.css';
                    }
                    return '[name].[hash][extname]';
                },
            },
        },
        cssCodeSplit: false, // 将CSS提取到单个文件中
    },
});

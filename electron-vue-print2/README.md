# zz-print 打印客户端

基于 Electron + Vue 3 + Vite 的打印客户端应用，支持条形码和二维码设计与打印。

## 环境要求

本项目使用 **Volta** 管理 Node.js 版本，确保团队开发环境一致。

### 安装 Volta

Windows 环境下载安装器：
```bash
# 访问 https://volta.sh/ 下载 Windows 安装包
# 或使用 PowerShell 快速安装：
iwr https://get.volta.sh/windows | iex
```

安装完成后重启终端，验证安装：
```bash
volta --version
```

### 安装项目依赖

项目已锁定 Node.js v22.22.1 和 npm v10.9.4，Volta 会自动使用正确版本：

```bash
# 配置 Electron 国内镜像（加速下载）
npm config set electron_mirror https://npmmirror.com/mirrors/electron/

# 安装依赖
npm install
```

## 开发运行

### 方式一：分步启动（推荐调试）
```bash
# 终端1：启动 Vite 开发服务器
npm run dev

# 终端2：启动 Electron 窗口
npm run start
```

### 方式二：一键启动
```bash
npm run electron:dev
```

## 打包构建

```bash
# 构建前端资源
npm run build

# 仅打包（不生成安装包）
npm run pack

# 生成 Windows 安装包
npm run dist
```

生成的安装包位于 `dist/` 目录。

## 项目结构

```
├── main.js          # Electron 主进程
├── preload.js       # 预加载脚本
├── index.html       # 入口 HTML
├── src/
│   ├── App.vue
│   ├── components/  # 组件
│   └── views/       # 视图页面
├── build/           # 构建资源
└── public/          # 静态资源
```

## 技术栈

- **Electron** 35.0.0 - 桌面应用框架
- **Vue 3.5** - 前端框架（Composition API）
- **Vite 7** - 构建工具
- **Ant Design Vue** - UI 组件库
- **JsBarcode** - 条形码生成
- **QRCode** - 二维码生成

# Skyline Globe · 全球实时摄像头图谱

> 在 3D 地球 / 暗色矢量地图上浏览全球 **2,141 路实时摄像头**，覆盖 70 个国家。支持 HLS (m3u8) 与 YouTube 嵌入两种流格式，数据来自 SkylineWebcams。

![tech stack](https://img.shields.io/badge/React-18-blue) ![tech stack](https://img.shields.io/badge/Vite-6-brightgreen) ![tech stack](https://img.shields.io/badge/MapLibre%20GL-5-0099ff) ![tech stack](https://img.shields.io/badge/HLS.js-1.6-ff6249)

---

## ✨ 功能特性

- 🌍 **地图浏览**：暗色矢量底图（OpenFreeMap），低缩放为 3D 地球投影，放大自动切换到平面墨卡托以保持流畅稳定。
- 📍 **摄像头按需加载**：缩放/拖动时按视口范围异步拉取摄像头，聚合显示（clustered pins），点击聚合点自动展开。
- 🎥 **实时播放**：点击摄像头红点播放直播。HLS 流通过本地代理绕过跨域与短期 token 校验，YouTube 用 iframe 嵌入；token 过期自动重试刷新。
- 🔍 **中英双语搜索**：支持中文或英文输入国家、城市、街道或摄像头名（如「罗马」「巴黎」「beach」）。
- 🗂️ **国家/地区中文目录**：左上角可折叠面板，按大洲分组列出全部 70 国，含摄像头数量徽标；点击一键飞往该国。
- 📱 **响应式布局**：移动端自动适配（隐藏品牌栏、目录面板滑入式）。

---

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + Vite 6 |
| 地图 | MapLibre GL JS 5（`globe` / `mercator` 双投影） |
| 播放 | HLS.js 1.6（HLS 流） + 原生 iframe（YouTube） |
| 图标 | lucide-react |
| 数据 | `public/data/skyline-cameras.json`（构建期生成） |
| 服务端 | Vite 中间件（本地 API 代理，无独立后端进程） |

---

## 📁 目录结构

```
skyline-globe/
├── index.html                      # 入口页(zh-CN)
├── src/
│   ├── main.jsx                    # 应用主逻辑(地图、搜索、播放、目录面板)
│   ├── styles.css                  # 全部样式
│   └── data/
│       ├── localization.js         # 国名/城市/标题中英映射 + 本地化函数
│       ├── city-zh-extra.js        # 补充的中文城市映射
│       └── continents.js           # 国家 → 大洲 映射(目录面板用)
├── public/data/
│   ├── skyline-cameras.json        # 摄像头目录(含中文字段),构建产物
│   ├── city-media.json             # 精选城市媒体包(备用)
│   └── skyline-cameras.schema.md   # 目录数据契约说明
├── scripts/
│   ├── build-catalog.mjs           # 从提取数据生成摄像头目录 + 中文字段
│   └── extract/                    # 移植自 pentagi 的流地址提取工具(自包含)
│       ├── extract_streams.py      # 核心提取模块(单摄像头)
│       ├── batch_extract.py        # 批量提取脚本(5 线程并发,全部 2,141 路)
│       ├── all_webcam_urls.json    # 摄像头详情页 URL 清单(批量提取输入)
│       ├── webcams.json            # 提取结果(HLS/YouTube 流地址),catalog 构建输入
│       └── player-demo.html        # 单文件播放器 Demo(可独立部署)
├── tmp-cities.json                 # GeoNames 城市坐标索引(构建时用于经纬度匹配)
└── vite.config.js                  # Vite 配置 + 本地 API 代理中间件
```

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18（Vite 6 要求）
- Python 3.9+（仅用于刷新数据脚本）

### 安装与运行

```bash
npm install
npm run dev        # 开发服务器 → http://localhost:5173
```

### 生产构建

```bash
npm run build      # 产物输出到 dist/
npm run preview    # 本地预览构建产物
```

### 重新生成摄像头目录

```bash
npm run catalog:build
```

该命令读取 `scripts/extract/webcams.json`，结合 `tmp-cities.json` 匹配城市坐标，并利用 `src/data/localization.js` 生成中文字段（`titleZh`/`cityZh`/`countryZh`）与多语言搜索串（`searchText`），输出到 `public/data/skyline-cameras.json`。

---

## 🔄 数据刷新流程（HLS token 约 2-4 小时过期）

SkylineWebcams 的 HLS token 是会话级别的，2-4 小时后失效。项目自带了从 pentagi 移植的提取脚本：

```bash
cd scripts/extract
python batch_extract.py     # 重新抓取全部详情页,提取新 token,输出 webcams.json
cd ../..
npm run catalog:build       # 用新数据重建前端目录
```

- `extract_streams.py`：核心模块，提供 `extract_stream_info(name, page_url)`，单次提取一个摄像头的流地址并校验 m3u8。
- `batch_extract.py`：5 线程并发批量提取，约 20 分钟跑完全部 2,141 路，附带内联验证（抽样 40 HLS + 5 YouTube）。
- **注意**：CDN 页面源码里是 `livee.m3u8`，运行时前端会转换为 `hd-auth.skylinewebcams.com/live.m3u8`，脚本已自动处理这一差异。

也可以指定旧目录读取数据（向后兼容）：

```bash
PENTAGI_OUTPUTS="D:/local-projects/pentagi/outputs" npm run catalog:build
```

---

## 📦 摄像头数据字段说明

`public/data/skyline-cameras.json` 顶层为 `{ source, generatedAt, total, playable, counts, cameras[] }`，每台摄像头：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识（国家-地区-城市-摄像头名 slug） |
| `title` / `titleZh` | 摄像头名（英文 / 中文，缺失时回退英文） |
| `subtitle` | 描述文本 |
| `cityName` / `cityZh` | 城市（英文 / 中文，缺失时回退「中文国名 · 英文城市」） |
| `countryName` / `countryZh` | 国家（英文 / 中文） |
| `lat` / `lon` / `precision` | 经纬度 / 精度（城市级或待补充） |
| `playbackType` | `hls` / `youtube` / `offline` |
| `status` | `online` / `youtube` / `offline` |
| `streamUrl` | 可直接使用的播放地址（HLS m3u8 或 YouTube embed） |
| `videoId` | YouTube 视频 ID（仅 YouTube 流） |
| `pageUrl` / `thumbnail` | 来源详情页 / 缩略图 |
| `searchText` | 小写拼接的中英多字段搜索串，供服务端直接匹配 |

---

## ⚠️ 已知限制

1. **Token 过期**：HLS token 约 2-4 小时失效，`webcams.json` 是提取时刻的快照。生产环境建议定时执行 `batch_extract.py` + `catalog:build`。
2. **CORS / Referer**：HLS CDN 可能校验 Referer，需经本地代理（已内置）访问，直接 `file://` 打开播放器可能遇到 CORS 问题。
3. **YouTube 地域限制**：部分 YouTube 嵌入流受地域限制，非所有地区可播放。
4. **摄像头离线**：目录中有少量 `offline` 条目，可能随时恢复，重新提取即可更新状态。
5. **城市坐标精度**：部分摄像头无精确坐标，标记为「位置待补充」，不会在地图上显示（搜索仍可用）。

---

## 📄 许可与数据来源

- 本项目仅用于**学习与研究**目的，使用前请遵守 [SkylineWebcams](https://www.skylinewebcams.com) 的服务条款。
- 流地址提取工具源自 `D:\local-projects\pentagi\outputs`（pentagi 项目），已复制进 `scripts/extract/` 使项目自包含。
- 底图 © OpenStreetMap 贡献者，矢量瓦片由 OpenFreeMap 提供。

---

*维护小贴士：每次升级字段或映射后运行 `npm run catalog:build` 并重启 dev server，前端会读取最新的中文与坐标数据。*

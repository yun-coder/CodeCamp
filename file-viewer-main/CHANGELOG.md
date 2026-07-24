# Changelog

对外更新日志维护在 [docs/changelog.md](docs/changelog.md)。

发布说明建议继续使用“用户为什么升级”的结构:

````md
## File Viewer vX.Y.Z

这次主要改进 [场景] 的体验。

### 适合升级的人

- 使用 [框架/包/部署方式] 的项目
- 遇到 [具体问题] 的项目

### Highlights

- 修复 / 改进 [用户可感知变化]
- 更新 Demo、Docs、离线资源或组件 README

### Upgrade

npm:

```bash
pnpm add @file-viewer/vue3-full@latest
````

CDN / 离线部署:

请同步更新 `dist` 目录下的 Worker、WASM、vendor 和字体资源。
```

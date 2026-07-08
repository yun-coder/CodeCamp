# 贡献指南

感谢你愿意帮助 File Viewer 变得更稳。这个项目最需要的贡献不只是代码，也包括真实业务场景里的兼容性反馈、部署反馈和可脱敏样本。

## 如何提交兼容性问题

请尽量提供这些信息:

1. 文件类型，例如 `docx` / `pptx` / `dwg` / `zip` / `eml`
2. 浏览器和版本，例如 Chrome 126、Edge、移动端 WebView
3. 接入方式，例如 Vue 3、React、Web Component、script 标签
4. 是否内网部署，是否自托管 Worker、WASM、字体或 vendor 资源
5. 现象截图、控制台错误、网络面板中失败的静态资源路径
6. 最小复现，或可公开的脱敏样本文件

如果文件不能公开，请描述文件来源和结构特征，例如“WPS 生成的多 sheet XLSX，包含图片和冻结窗格”。不要上传含有隐私、合同、身份证、客户信息或内部数据的原始文件。

## 本地开发

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm type-check
pnpm docs:build
```

常用验证命令:

```bash
pnpm verify:format-support
pnpm verify:ecosystem-readmes
pnpm verify:offline-assets
pnpm verify:demo-output
```

完整发布门禁较重，只在发版前或大改动后运行:

```bash
pnpm verify:migration-gates
```

## 提交代码

- 保持改动聚焦，一个 PR 尽量只解决一个问题。
- 改 renderer 时同步更新格式说明、Demo 样例或对应测试。
- 改组件 API 时同步检查 Vue、React、Svelte、jQuery、Web Component 的文档口径。
- 改 Worker / WASM / vendor 资源路径时同步跑离线资源验证。
- 不提交真实业务文件、密钥、`.env`、本地缓存或内部发布凭据。

## 文档和传播贡献

欢迎补充:

- 某个框架的最小接入示例
- 内网部署经验
- Worker / WASM / CSP 踩坑记录
- 某类格式的真实兼容性边界
- 可公开、可复现、体积较小的样本文件来源说明

如果这个方向对你有用，也欢迎收藏项目。比起单纯 Star，我更希望收到真实场景下的兼容性反馈。

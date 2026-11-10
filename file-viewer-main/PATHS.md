# 本地偏离记录（相对上游仓库）

本文件记录本工作副本与上游 `file-viewer` 源码之间的**有意偏离**，便于将来 `git pull` / 重新下载快照时对账与还原。除下列条目外，源码未做其它修改。

## 1. `presets` 包缺失 → 依赖改为从 npm 解析

- **时间**：2026-11-10
- **现象**：`pnpm install` 直接失败并报
  `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND: "@file-viewer/preset-all@workspace:^2.1.13" is in the dependencies but no package named "@file-viewer/preset-all" is present in the workspace`。
  工作区里没有 `packages/presets/*`，`pnpm-workspace.yaml` 也没有对应 glob，但下列包声明了对它的 workspace 依赖。
- **处理**：把这 9 个清单里的
  `"@file-viewer/preset-all": "workspace:^2.1.13"`
  改为
  `"@file-viewer/preset-all": "^2.1.13"`
  让 pnpm 从 npm 安装同版本（npm 上存在 2.1.13），并提交 `pnpm-lock.yaml` 固定解析结果。

  改动文件：
  - `apps/viewer-demo/package.json`
  - `packages/components/jquery-full/package.json`
  - `packages/components/react-full/package.json`
  - `packages/components/react-legacy-full/package.json`
  - `packages/components/svelte-full/package.json`
  - `packages/components/vue2.6-full/package.json`
  - `packages/components/vue2.7-full/package.json`
  - `packages/components/web-full/package.json`
  - `packages/components/vue3-full/package.json`

- **还原方式**：上游补回 `packages/presets/` 源码、并把 `packages/presets/*` 加进 `pnpm-workspace.yaml` 之后，把上述 9 行的 `^2.1.13` 改回 `workspace:^2.1.13`，再 `pnpm install` 重新生成锁文件。
- **注意**：这两处的副作用是 `-full` 系列包会链接 npm 上的 preset 产物，而不是本地源码；若在本地修改 preset 源码，需要改回 workspace 依赖才会生效。

## 已验证

- `pnpm install`：51 个 workspace 包安装成功（pnpm 11.0.9，Node 24.18.0）。
- `pnpm --filter @file-viewer/core build`：构建通过。

# Branch And Source Boundaries

Flyfish Viewer uses one private aggregate workspace and several public open-source repositories. Keep these roles stable when releasing or synchronizing code.

| Branch | Role | Package responsibility | Source boundary |
| --- | --- | --- | --- |
| `main` | Private original aggregate workspace | `@flyfish-group/file-viewer-workspace` | Private Gitea original repository. Maintains the complete monorepo: apps, docs, core, standard component packages, compatibility aliases, release automation, internal integration history, and priority support context. It is not reduced to `@file-viewer/core`. |
| `v2` | Vue 2.7 component line | `@file-viewer/vue2.7`, `@flyfish-group/file-viewer` | Shares `@file-viewer/core`; exported component source is synchronized to the public `flyfish-dev/file-viewer-vue2.7` repositories. |
| `v3` | Vue 3 component line | `@file-viewer/vue3`, `@flyfish-group/file-viewer3`, `file-viewer3` | Shares `@file-viewer/core`; exported component source is synchronized to the public `flyfish-dev/file-viewer-vue3` repositories. |

All other ecosystem packages (`@file-viewer/react`, `@file-viewer/react-legacy`, `@file-viewer/web`, `@file-viewer/jquery`, and `@file-viewer/svelte`) are maintained as standard component packages and exported to public GitHub/Gitee repositories under `flyfish-dev`.

The public `flyfish-dev/file-viewer` repository is the open-source aggregate and one-stop distribution entry. It contains runnable main demo source, component demo source, `@file-viewer/core`, standard component packages, compatibility aliases, documentation source, built/minified output, demo/docs output, samples, release tarballs, release manifests, and bilingual README files. It is not the private original repository.

The private Gitea `main` branch remains the complete original aggregate workspace with branch cutover history, release automation, internal integration scripts, and priority support context. Sponsorship through the shop is for maintainer support and priority help while the public repositories remain open source.

Before replacing remote branch roles, maintainers should prepare and inspect dry-run snapshots from the private aggregate workspace:

```bash
pnpm branch:cutover:prepare
pnpm branch:cutover:verify
pnpm branch:cutover:apply
```

The snapshots are written to `.release/branch-cutover/v2-vue2.7-component` and `.release/branch-cutover/v3-vue3-component` inside that private workspace. They contain standalone package trees plus `BRANCH_ROLE.md` and `branch-cutover-manifest.json`, so maintainers can verify the exact future `v2` and `v3` contents. Private Gitea `main` is updated from the complete current workspace, not from a core-only snapshot.

`pnpm branch:cutover:apply` is a dry-run command by default. To actually update the private Gitea `main`, `v2`, and `v3` branches, maintainers must re-run it with `-- --push`; the script first backs up the existing remote branch heads under `workspace/pre-branch-cutover-*`, updates `main` from the complete current workspace, and uses `--force-with-lease` for the target branch updates.

Run the source-boundary gate before release work:

```bash
pnpm verify:branch-roles
```

This command checks `ecosystem/branch-roles.json`, `ecosystem/wrappers.json`, the configured `origin` remote, component repository ownership, core visibility, and the open-source main repository policy.

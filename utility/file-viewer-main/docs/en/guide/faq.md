# FAQ

## The viewer is blank

Confirm the host container has a stable height and the file has a recognizable extension or explicit `type`.

## A worker or WASM file does not load

Run:

```bash
npx file-viewer-copy-assets ./public/file-viewer
```

Then confirm your server returns the correct MIME type for `.wasm`, `.js`, fonts, and JSON manifests. Strict CSP deployments should serve all viewer assets from the same trusted origin.

## npm 11 fails with `Cannot read properties of null (reading 'matches')`

This is usually not a `@file-viewer/*` version mismatch. We verify npm 11.17.0 against a clean registry install and a local tgz dependency-closure install for `@file-viewer/vue3 + @file-viewer/preset-office`.

The message is an npm Arborist crash while building the dependency tree. The most common trigger is a project directory whose `node_modules` was created by pnpm, bun, vlt, or another package manager, followed by `npm install` in the same directory. npm may hit a store-style symlink with a null target and throw this internal `matches` TypeError.

Use one package manager per project and reset the install directory:

```bash
# If the project uses npm
rm -rf node_modules package-lock.json npm-shrinkwrap.json
npm cache verify
npm install
```

```bash
# If the project uses pnpm, keep using pnpm
rm -rf node_modules package-lock.json
pnpm install
```

For offline tgz installs, the top-level tgz still needs all runtime dependencies to resolve from npm, a private registry, or sibling local tarballs. In intranet environments, publish the same-version `@file-viewer/vue3`, the selected preset, its renderer packages, and `@file-viewer/core` to a private registry, or declare the local tgz dependency closure together.

Release verification includes:

```bash
pnpm verify:npm-install-smoke
```

## Can I deploy without public CDNs?

Yes. Runtime assets are designed to be self-hosted. Draw.io, Typst, CAD, Archive, PDF, DOCX, Spreadsheet, SQLite, and other heavy assets can be copied into your own static directory.

## Why does every format not expose every toolbar action?

Each renderer reports operation availability. Download is usually available, but print, HTML export, search, zoom, page navigation, and text anchors depend on the active renderer.

## Should I use an iframe?

No for standard package integrations. Use the native package for your stack. iframe-style demos can still be useful for embedding the full hosted demo, but the core product path is native and debuggable.

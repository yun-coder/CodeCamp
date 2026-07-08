# Format Fidelity

<div class="doc-kicker">Clear Capability Boundaries</div>

<p class="doc-lead">
  Flyfish Viewer documents what is fully rendered, what is structurally inspected, and which formats need specialist engines for perfect fidelity.
</p>

## High-confidence Preview Lines

- PDF, OFD, images, audio, video, Markdown, source code, text, JSON/YAML/TOML/XML/SQL, archives, email, EPUB, Mermaid, Excalidraw, draw.io, and common Office/OpenDocument files.
- CAD preview is powered by `@flyfish-dev/cad-viewer` through `@file-viewer/renderer-cad`; DWG, DXF, DWF, and DWFx assets stay self-hostable.
- Word preview uses `@file-viewer/renderer-word` and the self-maintained `@file-viewer/docx` path for readable stream-style DOCX rendering.
- Presentation preview uses `@file-viewer/renderer-presentation` and the standalone `@file-viewer/pptx` engine.

## Structure-first Lines

Some engineering formats are intentionally conservative:

| Format family | Current behavior |
| --- | --- |
| OLB / DRA | Safe structure preview for common OrCAD / Allegro containers and readable metadata |
| OAS / OASIS | Readable fixtures render; complex binary OASIS stays structure-index focused until the dedicated layout kernel matures |
| STEP / IGES / IFC / 3DM / BREP | Signature detection and conversion guidance, with visual support delegated to dedicated WASM engines |
| PlantUML | Offline source/SVG-style preview by default; configure an intranet PlantUML service for full server-rendered SVG |

## Verification

Use the built-in checks when the format matrix changes:

```bash
pnpm verify:format-support
pnpm verify:smoke-matrix
pnpm verify:renderer-assets
```


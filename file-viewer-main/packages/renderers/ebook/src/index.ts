import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderContext,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

const epubDefinition = DEFAULT_RENDERER_DEFINITIONS.find(
  definition => definition.id === 'epub'
) as RendererDefinition | undefined;
const umdDefinition = DEFAULT_RENDERER_DEFINITIONS.find(
  definition => definition.id === 'umd'
) as RendererDefinition | undefined;

if (!epubDefinition || !umdDefinition) {
  throw new Error('@file-viewer/renderer-epub could not locate the shared ebook format definitions.');
}

export const ebookRendererDefinition = epubDefinition;
export const umdRendererDefinition = umdDefinition;

export const renderFileViewerEpub: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  _type,
  context?: FileRenderContext
) => import('./epub.js').then(({ default: renderEpub }) => renderEpub(buffer, target, context));

export const renderFileViewerUmd: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  _type,
  context?: FileRenderContext
) => import('./umd.js').then(({ default: renderUmd }) => renderUmd(buffer, target, context));

export const ebookRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-epub',
  label: 'Flyfish File Viewer ebook renderer',
  definitions: [ebookRendererDefinition, umdRendererDefinition],
  handlers: [
    {
      rendererId: ebookRendererDefinition.id,
      handler: renderFileViewerEpub,
    },
    {
      rendererId: umdRendererDefinition.id,
      handler: renderFileViewerUmd,
    },
  ],
};

export default ebookRenderer;

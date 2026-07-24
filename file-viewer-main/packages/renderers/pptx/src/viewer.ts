import { renderPptxPostProcessing } from './chart';
import { resolvePptxEngineOptions, RECOMMENDED_ZIP_LIMITS } from './options';
import { ensurePptxViewerStyles } from './styles';
import type { PptxViewerOptions, PptxWorkerMessage } from './types';
import { createPptxWorker } from './worker';

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const toPercent = (value: number | undefined) => {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 100;
  return clamp(numeric, 25, 300);
};

const ensureZipWithinLimits = (buffer: ArrayBuffer, options: PptxViewerOptions) => {
  const limits = {
    ...RECOMMENDED_ZIP_LIMITS,
    ...options.zipLimits,
  };

  if (limits.maxFileBytes && buffer.byteLength > limits.maxFileBytes) {
    throw new Error(`PPTX file is too large to preview safely (${buffer.byteLength} bytes).`);
  }
};

const appendHtml = (container: HTMLElement, html: string) => {
  const template = container.ownerDocument.createElement('template');
  template.innerHTML = html;
  const nodes = Array.from(template.content.children);
  container.append(template.content);
  return nodes[0] || null;
};

export class PptxViewer {
  static async open(
    buffer: ArrayBuffer,
    target: HTMLElement,
    options: PptxViewerOptions = {}
  ) {
    const viewer = new PptxViewer(buffer, target, options);
    await viewer.open();
    return viewer;
  }

  readonly target: HTMLElement;
  readonly content: HTMLDivElement;
  readonly scaleBox: HTMLDivElement;
  private readonly buffer: ArrayBuffer;
  private readonly options: PptxViewerOptions;
  private worker: Worker | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame = 0;
  private fitScale = 1;
  private userZoomPercent = 100;
  private currentZoomPercent = 100;
  private thumbnailElement: HTMLImageElement | null = null;
  private disposed = false;
  private completed = false;

  private constructor(buffer: ArrayBuffer, target: HTMLElement, options: PptxViewerOptions) {
    this.buffer = buffer;
    this.target = target;
    this.options = options;
    this.userZoomPercent = toPercent(options.zoomPercent);
    this.currentZoomPercent = this.userZoomPercent;

    const documentRef = target.ownerDocument || document;
    this.scaleBox = documentRef.createElement('div');
    this.scaleBox.className = 'flyfish-pptx-scale-box';
    this.content = documentRef.createElement('div');
    this.content.className = 'flyfish-pptx-content';
    this.content.dataset.renderState = 'loading';
    this.scaleBox.append(this.content);
  }

  get zoomPercent() {
    return Math.round(this.currentZoomPercent);
  }

  async open() {
    ensureZipWithinLimits(this.buffer, this.options);
    ensurePptxViewerStyles(this.target.ownerDocument || document);
    this.target.replaceChildren(this.scaleBox);
    this.attachResizeObserver();
    this.startWorker();
  }

  async setZoom(percent: number) {
    const desiredEffectivePercent = toPercent(percent);
    this.userZoomPercent = clamp(desiredEffectivePercent / Math.max(this.fitScale, 0.01), 25, 600);
    this.scheduleResize();
  }

  destroy() {
    this.disposed = true;
    this.worker?.terminate();
    this.worker = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeFrame) {
      this.target.ownerDocument.defaultView?.cancelAnimationFrame(this.resizeFrame);
    }
    this.target.replaceChildren();
  }

  private startWorker() {
    this.worker?.terminate();
    this.completed = false;
    this.content.dataset.renderState = 'loading';
    this.worker = createPptxWorker(this.options);
    this.worker.addEventListener('message', event => this.processMessage(event.data));
    this.worker.addEventListener('error', event => this.fail(event.error || event.message));
    this.worker.postMessage({
      type: 'processPPTX',
      data: this.buffer,
      IE11: false,
      options: resolvePptxEngineOptions(this.options.engineOptions),
    });
  }

  private processMessage(message: PptxWorkerMessage) {
    if (this.disposed || this.completed) {
      return;
    }

    switch (message.type) {
      case 'slide': {
        this.clearThumbnail();
        const element = appendHtml(this.content, String(message.data || ''));
        this.scheduleResize();
        this.options.onSlideRendered?.(Number(message.slide_num || 0), element);
        break;
      }
      case 'pptx-thumb':
        this.showThumbnail(String(message.data || ''));
        this.options.onThumbnail?.(String(message.data || ''));
        break;
      case 'slideSize':
        this.options.onSlideSize?.((message.data || {}) as any);
        break;
      case 'globalCSS':
        this.appendGlobalCss(String(message.data || ''));
        break;
      case 'progress-update':
        this.options.onProgress?.(Number(message.data || 0), message);
        break;
      case 'ExecutionTime':
      case 'Done':
        void this.complete(message.charts);
        break;
      case 'WARN':
        this.options.onWarning?.(message.data);
        break;
      case 'ERROR':
        this.fail(message.data);
        break;
      default:
        break;
    }
  }

  private appendGlobalCss(css: string) {
    if (!css) {
      return;
    }

    const style = this.target.ownerDocument.createElement('style');
    style.textContent = css;
    this.content.append(style);
  }

  private showThumbnail(base64Jpeg: string) {
    if (!base64Jpeg || this.content.children.length > 0) {
      return;
    }

    const image = this.target.ownerDocument.createElement('img');
    image.className = 'flyfish-pptx-thumbnail';
    image.alt = 'PPTX preview thumbnail';
    image.src = `data:image/jpeg;base64,${base64Jpeg}`;
    this.thumbnailElement = image;
    this.scaleBox.insertBefore(image, this.content);
  }

  private clearThumbnail() {
    this.thumbnailElement?.remove();
    this.thumbnailElement = null;
  }

  private async complete(charts: unknown) {
    if (this.disposed || this.completed) {
      return;
    }

    this.completed = true;
    this.content.dataset.renderState = 'ready';
    this.worker?.terminate();
    this.worker = null;
    this.scheduleResize();
    await renderPptxPostProcessing(charts, this.content);
    this.scheduleResize();
    this.options.onRenderComplete?.();
  }

  private fail(error: unknown) {
    if (this.disposed) {
      return;
    }

    this.completed = true;
    this.worker?.terminate();
    this.worker = null;
    this.content.dataset.renderState = 'error';
    this.options.onError?.(error);
  }

  private attachResizeObserver() {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(this.target);
    if (this.target.parentElement) {
      this.resizeObserver.observe(this.target.parentElement);
    }
  }

  private scheduleResize() {
    const view = this.target.ownerDocument.defaultView || window;
    if (this.resizeFrame) {
      view.cancelAnimationFrame(this.resizeFrame);
    }
    this.resizeFrame = view.requestAnimationFrame(() => this.resize());
  }

  private resize() {
    const HTMLElementCtor = this.target.ownerDocument.defaultView?.HTMLElement || HTMLElement;
    const slides = Array.from(this.content.children).filter((child): child is HTMLElement => {
      return child instanceof HTMLElementCtor && (child.classList.contains('slide') || child.tagName === 'SECTION');
    });

    if (!slides.length) {
      return;
    }

    const slideWidth = Math.max(...slides.map(slide => slide.offsetWidth), 0);
    if (!slideWidth) {
      return;
    }

    const viewportWidth = this.target.clientWidth || this.target.parentElement?.clientWidth || slideWidth;
    this.fitScale = this.options.fitMode === 'none'
      ? 1
      : Math.min(1, viewportWidth / slideWidth);
    const effectiveScale = clamp(this.fitScale * (this.userZoomPercent / 100), 0.25, 3);
    this.currentZoomPercent = effectiveScale * 100;

    this.content.style.width = `${slideWidth}px`;
    this.content.style.transform = `scale(${effectiveScale})`;
    this.scaleBox.style.width = `${Math.ceil(slideWidth * effectiveScale)}px`;
    this.scaleBox.style.minHeight = `${Math.ceil(this.content.scrollHeight * effectiveScale)}px`;
  }
}

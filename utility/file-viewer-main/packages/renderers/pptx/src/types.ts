export type PptxFitMode = 'contain' | 'none';

export interface PptxZipLimits {
  maxFileBytes?: number;
}

export interface PptxListOptions {
  windowed?: boolean;
  initialSlides?: number;
  batchSize?: number;
  overscanViewport?: number;
}

export interface PptxWorkerFactoryOptions {
  workerFactory?: () => Worker;
  workerUrl?: string | URL;
  workerType?: WorkerType;
}

export interface NativePptxEngineOptions {
  slidesScale?: string;
  slideMode?: boolean;
  slideType?: string;
  revealjsPath?: string;
  keyBoardShortCut?: boolean;
  mediaProcess?: boolean;
  jsZipV2?: boolean;
  themeProcess?: boolean | 'colorsAndImageOnly';
  incSlide?: {
    width: number;
    height: number;
  };
  slideModeConfig?: Record<string, unknown>;
  revealjsConfig?: Record<string, unknown>;
}

export interface PptxSlideSize {
  width?: number;
  height?: number;
  [key: string]: unknown;
}

export interface PptxViewerOptions extends PptxWorkerFactoryOptions {
  fitMode?: PptxFitMode;
  zoomPercent?: number;
  zipLimits?: PptxZipLimits;
  engineOptions?: Partial<NativePptxEngineOptions>;
  lazySlides?: boolean;
  lazyMedia?: boolean;
  listOptions?: PptxListOptions;
  onProgress?: (progress: number, message: unknown) => void;
  onThumbnail?: (base64Jpeg: string) => void;
  onSlideSize?: (size: PptxSlideSize) => void;
  onSlideRendered?: (slideIndex: number, element: Element | null) => void;
  onSlideError?: (slideIndex: number, error: unknown) => void;
  onRenderComplete?: () => void;
  onWarning?: (warning: unknown) => void;
  onError?: (error: unknown) => void;
}

export interface PptxWorkerMessage {
  type: string;
  data?: unknown;
  slide_num?: number;
  file_name?: string;
  charts?: unknown;
}

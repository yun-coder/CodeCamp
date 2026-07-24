import type { NativePptxEngineOptions, PptxZipLimits } from './types';

export const RECOMMENDED_ZIP_LIMITS: Required<PptxZipLimits> = {
  maxFileBytes: 160 * 1024 * 1024,
};

export const createDefaultPptxOptions = (): NativePptxEngineOptions => ({
  slidesScale: '',
  slideMode: false,
  slideType: 'divs2slidesjs',
  revealjsPath: '',
  keyBoardShortCut: false,
  mediaProcess: true,
  jsZipV2: false,
  themeProcess: true,
  incSlide: {
    width: 0,
    height: 0,
  },
  slideModeConfig: {
    first: 1,
    nav: true,
    navTxtColor: 'black',
    keyBoardShortCut: true,
    showSlideNum: true,
    showTotalSlideNum: true,
    autoSlide: true,
    randomAutoSlide: false,
    loop: false,
    background: false,
    transition: 'default',
    transitionTime: 1,
  },
  revealjsConfig: {},
});

export const resolvePptxEngineOptions = (
  options?: Partial<NativePptxEngineOptions>
): NativePptxEngineOptions => {
  const defaults = createDefaultPptxOptions();

  return {
    ...defaults,
    ...options,
    incSlide: {
      width: options?.incSlide?.width ?? defaults.incSlide?.width ?? 0,
      height: options?.incSlide?.height ?? defaults.incSlide?.height ?? 0,
    },
    slideModeConfig: {
      ...defaults.slideModeConfig,
      ...options?.slideModeConfig,
    },
    revealjsConfig: {
      ...defaults.revealjsConfig,
      ...options?.revealjsConfig,
    },
  };
};

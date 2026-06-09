/**
 * ComicBook IR.
 *
 * Structured handoff between a user's idea and rendered comic pages. Artwork,
 * lettering, and layout stay separate so image models can generate clean
 * panels while readable text is overlaid later by HTML/CSS/PDF renderers.
 */

export type ComicFormat = 'book' | 'webtoon' | 'strip';

export type ComicStyle =
  | 'american-color'
  | 'childrens-picture-book'
  | 'webtoon-color'
  | 'european-bd'
  | 'watercolor'
  | 'noir-color'
  | 'custom';

export type ComicAudience = 'children' | 'teen' | 'adult' | 'brand' | 'education';

export type PanelShot =
  | 'wide'
  | 'medium'
  | 'close-up'
  | 'extreme-close-up'
  | 'over-shoulder'
  | 'establishing'
  | 'action';

export type LetteringKind = 'speech' | 'thought' | 'caption' | 'sfx';

export interface CharacterVisualLock {
  description: string;
  palette: string[];
  negativePrompt?: string;
  referenceAssetIds?: string[];
}

export interface ComicCharacter {
  id: string;
  name: string;
  role: 'protagonist' | 'supporting' | 'antagonist' | 'narrator' | 'background';
  personality: string;
  visual: CharacterVisualLock;
}

export interface ComicLettering {
  id: string;
  kind: LetteringKind;
  speakerCharacterId?: string;
  text: string;
  placement?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ComicPanel {
  id: string;
  pageId: string;
  order: number;
  shot: PanelShot;
  scene: string;
  action: string;
  characters: string[];
  background: string;
  mood: string;
  imagePrompt: string;
  negativePrompt?: string;
  lettering: ComicLettering[];
  generatedImageAssetId?: string;
}

export interface ComicPage {
  id: string;
  order: number;
  title?: string;
  layout:
    | 'single-splash'
    | 'two-panel'
    | 'three-panel'
    | 'four-panel-grid'
    | 'manga-grid'
    | 'webtoon-scroll'
    | 'custom';
  summary: string;
  panels: ComicPanel[];
}

export interface ComicExportTargets {
  pdf: boolean;
  pngPages: boolean;
  webtoonLongImage: boolean;
  mp4Trailer: boolean;
}

export interface ComicBookPlan {
  schemaVersion: 1;
  format: ComicFormat;
  style: ComicStyle;
  audience: ComicAudience;
  title: string;
  logline: string;
  synopsis: string;
  language: string;
  pageCount: number;
  characters: ComicCharacter[];
  pages: ComicPage[];
  exportTargets: ComicExportTargets;
  safety: {
    originalCharactersOnly: boolean;
    disallowLivingArtistStyleImitation: boolean;
    commercialUseIntended: boolean;
    disclosureText?: string;
  };
}

export interface ComicValidationError {
  code:
    | 'empty-comic'
    | 'page-count-mismatch'
    | 'duplicate-id'
    | 'panel-page-mismatch'
    | 'unknown-character'
    | 'empty-lettering'
    | 'missing-visual-lock';
  message: string;
  ref?: string;
}

export interface ComicValidationResult {
  ok: boolean;
  errors: ComicValidationError[];
  warnings: ComicValidationError[];
}

export function validateComicBookPlan(plan: ComicBookPlan): ComicValidationResult {
  const errors: ComicValidationError[] = [];
  const warnings: ComicValidationError[] = [];

  const pages = plan.pages ?? [];

  if (pages.length === 0) {
    warnings.push({
      code: 'empty-comic',
      message: 'Comic image collection has no pages yet; generate the image list next',
    });
  }

  if (pages.length > 0 && plan.pageCount !== pages.length) {
    warnings.push({
      code: 'page-count-mismatch',
      message: `Declared pageCount ${plan.pageCount} differs from actual pages ${pages.length}`,
    });
  }

  const ids = new Set<string>();
  const addId = (id: string, kind: string) => {
    if (ids.has(id)) {
      errors.push({ code: 'duplicate-id', message: `Duplicate ${kind} id "${id}"`, ref: id });
    }
    ids.add(id);
  };

  const characterIds = new Set<string>();
  for (const character of plan.characters ?? []) {
    addId(character.id, 'character');
    characterIds.add(character.id);
    if (!character.visual?.description || character.visual.palette.length === 0) {
      errors.push({
        code: 'missing-visual-lock',
        message: `Character "${character.id}" needs a visual lock description and palette`,
        ref: character.id,
      });
    }
  }

  for (const page of pages) {
    addId(page.id, 'page');
    for (const panel of page.panels) {
      addId(panel.id, 'panel');
      if (panel.pageId !== page.id) {
        errors.push({
          code: 'panel-page-mismatch',
          message: `Panel "${panel.id}" belongs to "${panel.pageId}" but is nested under "${page.id}"`,
          ref: panel.id,
        });
      }
      for (const characterId of panel.characters) {
        if (!characterIds.has(characterId)) {
          errors.push({
            code: 'unknown-character',
            message: `Panel "${panel.id}" references unknown character "${characterId}"`,
            ref: panel.id,
          });
        }
      }
      for (const lettering of panel.lettering) {
        addId(lettering.id, 'lettering');
        if (!lettering.text.trim()) {
          errors.push({
            code: 'empty-lettering',
            message: `Lettering "${lettering.id}" has no text`,
            ref: lettering.id,
          });
        }
        if (lettering.speakerCharacterId && !characterIds.has(lettering.speakerCharacterId)) {
          errors.push({
            code: 'unknown-character',
            message: `Lettering "${lettering.id}" references unknown speaker "${lettering.speakerCharacterId}"`,
            ref: lettering.id,
          });
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function flattenComicPanels(plan: ComicBookPlan): ComicPanel[] {
  return plan.pages
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((page) => page.panels.slice().sort((a, b) => a.order - b.order));
}

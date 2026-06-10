/**
 * Server-side comic types. These mirror the IR but loosen the readonly
 * expectations (panels/pages get mutated when we write back generated
 * image asset ids). They live in `server/` because only the backend
 * mutates them; the client only reads via JSON.
 */

import type {
  ComicAudience,
  ComicBookPlan,
  ComicExportTargets,
  ComicFormat,
  ComicStyle,
} from '../ir/comic.js';

export interface ProjectComicSettings {
  format?: ComicFormat;
  style?: ComicStyle;
  audience?: ComicAudience;
  targetPageCount?: number;
  exportTargets?: Partial<ComicExportTargets>;
  /** Keep image generation text-free; lettering is rendered as an overlay. */
  overlayLettering?: boolean;
  /** Enforce original characters and block risky IP/style imitation. */
  commercialSafetyMode?: boolean;
}

export type { ComicBookPlan, ComicExportTargets };

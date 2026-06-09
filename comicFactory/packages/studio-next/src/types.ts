/**
 * studio-next — frontend types for the comic book editor.
 * Mirrors the ComicBook IR from @video-pipeline/content-graph.
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
  kind: 'speech' | 'thought' | 'caption' | 'sfx';
  speakerCharacterId?: string;
  text: string;
  placement?: { x: number; y: number; width: number; height: number };
}

export interface ComicPanel {
  id: string;
  pageId: string;
  order: number;
  shot: string;
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
  layout: string;
  summary: string;
  panels: ComicPanel[];
}

export interface ComicBookPlan {
  schemaVersion: number;
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
  exportTargets: {
    pdf: boolean;
    pngPages: boolean;
    webtoonLongImage: boolean;
    mp4Trailer: boolean;
  };
  safety: {
    originalCharactersOnly: boolean;
    disallowLivingArtistStyleImitation: boolean;
    commercialUseIntended: boolean;
    disclosureText?: string;
  };
}

export interface Project {
  id: string;
  name: string;
  intent?: string;
  status: string;
  templateId: string | null;
  agentId?: string | null;
  agentModel?: string | null;
  comicBookPath?: string;
  comicSettings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type WorkflowPhase = 'idea' | 'story' | 'script' | 'images' | 'export';

export interface AppState {
  projects: Project[];
  selectedId: string | null;
  plan: ComicBookPlan | null;
  phase: WorkflowPhase;
  generating: boolean;
  chatMessages: ChatMessage[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

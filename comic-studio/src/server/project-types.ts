/**
 * Project persistence types — slimmed down to what the 5-phase comic workflow
 * needs. Compared to the parent monorepo's Project, we drop the engine/video
 * fields (templateId, variables, frames, contentGraphPath, soundtrack,
 * assets) and keep only: id, name, intent, agent selection, comicBookPath,
 * comicSettings, and timestamps.
 */

import type { ProjectComicSettings } from './comic-types.js';

export type ProjectStatus = 'draft' | 'previewed' | 'rendered';

export interface Project {
  id: string;
  name: string;
  intent?: string;
  /** Detected agent id, e.g. "claude" or "codex". null = default first available. */
  agentId?: string | null;
  /** Model id for agents that support it. null = agent's default. */
  agentModel?: string | null;
  status: ProjectStatus;
  /** Absolute path to the persisted ComicBookPlan JSON. */
  comicBookPath?: string;
  /** User-tuned comic settings (mirror ComicBookPlan summary fields). */
  comicSettings?: ProjectComicSettings;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  intent?: string;
}

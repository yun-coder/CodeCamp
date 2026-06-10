/**
 * Server context — wired together in `index.ts`, consumed by route handlers.
 *
 * Kept minimal: just the data store and the (project × plan) pair. Anything
 * else routes need is computed on demand.
 */

import type { ProjectStore } from './project-store.js';
import type { ComicPlanStore } from './comic-plan-store.js';

export interface ServerContext {
  /** Root directory for persisted projects (defaults to process.cwd()). */
  dataRoot: string;
  projects: ProjectStore;
  planStore: ComicPlanStore;
}

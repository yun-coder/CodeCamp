/**
 * ComicBookPlan persistence + orchestration.
 *
 * Wraps ProjectStore with two extra methods:
 *   - writeComicBookPlan(projectId, plan): validates, persists, and updates
 *     the project metadata to point at the new file.
 *   - readComicBookPlan(projectId): returns the plan or null.
 *
 * Mirrors @video-pipeline/core → ProjectOrchestrator.{writeComicBookPlan,
 * readComicBookPlan} but trimmed (no engine, no asset ops, no preview render
 * hooks — those are owned by the route handlers).
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateComicBookPlan } from '../ir/comic.js';
import type { ComicBookPlan } from '../ir/comic.js';
import { ComicStudioError } from './errors.js';
import type { ProjectStore } from './project-store.js';
import type { Project } from './project-types.js';

export class ComicPlanStore {
  constructor(
    private readonly projects: ProjectStore,
  ) {}

  async writeComicBookPlan(
    projectId: string,
    plan: ComicBookPlan,
  ): Promise<{ project: Project; comicBookPath: string }> {
    const result = validateComicBookPlan(plan);
    if (!result.ok) {
      throw new ComicStudioError(
        'invalid-input',
        `ComicBookPlan invalid: ${result.errors.map((e) => e.message).join('; ')}`,
      );
    }
    const project = await this.projects.load(projectId);
    const projectDir = await this.projects.ensureDir(projectId);
    const comicDir = join(projectDir, 'comic');
    await mkdir(comicDir, { recursive: true });
    const comicBookPath = join(comicDir, 'comic-book.json');
    await writeFile(comicBookPath, JSON.stringify(plan, null, 2), 'utf8');
    project.comicBookPath = comicBookPath;
    project.comicSettings = {
      ...project.comicSettings,
      format: plan.format,
      style: plan.style,
      audience: plan.audience,
      targetPageCount: plan.pageCount,
      exportTargets: plan.exportTargets,
      overlayLettering: true,
      commercialSafetyMode: plan.safety.commercialUseIntended,
    };
    if (project.status === 'rendered') project.status = 'previewed';
    else if (project.status === 'previewed') project.status = 'previewed';
    else project.status = 'draft';
    await this.projects.save(project);
    return { project, comicBookPath };
  }

  async readComicBookPlan(projectId: string): Promise<ComicBookPlan | null> {
    const project = await this.projects.load(projectId);
    if (!project.comicBookPath) return null;
    if (!existsSync(project.comicBookPath)) return null;
    return JSON.parse(await readFile(project.comicBookPath, 'utf8')) as ComicBookPlan;
  }
}

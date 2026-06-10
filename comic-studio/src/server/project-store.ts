/**
 * ProjectStore — JSON-on-disk persistence for comic-studio projects.
 *
 * Layout under <dataRoot>:
 *   .comic-studio/
 *     projects/
 *       proj_xxxxxxxx/           ← one folder per project
 *         project.json            ← Project metadata
 *         messages.json           ← chat history (used by side panel)
 *         comic/
 *           comic-book.json       ← ComicBookPlan
 *           preview.html          ← generated preview HTML
 *           images/               ← generated panel images
 *             comic-panelId-0.png
 *           webtoon/webtoon.html  ← webtoon export
 *
 * Originally from @video-pipeline/core (registry.ts → ProjectStore).
 * Lifted and inlined; behavior is identical to the parent implementation.
 */

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ComicStudioError } from './errors.js';
import type { Project } from './project-types.js';

export class ProjectStore {
  constructor(private readonly dataRoot: string) {}

  private dir(): string {
    return join(this.dataRoot, '.comic-studio', 'projects');
  }

  private projectDir(id: string): string {
    return join(this.dir(), id);
  }

  private path(id: string): string {
    return join(this.projectDir(id), 'project.json');
  }

  /** Ensure project directory + subdirs exist; returns its absolute path. */
  async ensureDir(id: string): Promise<string> {
    const dir = this.projectDir(id);
    await mkdir(join(dir, 'comic', 'images'), { recursive: true });
    return dir;
  }

  async save(project: Project): Promise<void> {
    await this.ensureDir(project.id);
    project.updatedAt = new Date().toISOString();
    await writeFile(this.path(project.id), JSON.stringify(project, null, 2), 'utf8');
  }

  async load(id: string): Promise<Project> {
    const p = this.path(id);
    if (!existsSync(p)) {
      throw new ComicStudioError('project-not-found', `Project ${id} not found`);
    }
    return JSON.parse(await readFile(p, 'utf8')) as Project;
  }

  async list(): Promise<Project[]> {
    const d = this.dir();
    if (!existsSync(d)) return [];
    const ids = await readdir(d);
    const out: Project[] = [];
    for (const id of ids) {
      try {
        out.push(await this.load(id));
      } catch {
        // skip corrupt
      }
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return out;
  }

  async create(input: { name: string; intent?: string }): Promise<Project> {
    const id = `proj_${randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const project: Project = {
      id,
      name: input.name,
      ...(input.intent !== undefined && { intent: input.intent }),
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    await this.save(project);
    return project;
  }

  async remove(id: string): Promise<void> {
    const dir = this.projectDir(id);
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

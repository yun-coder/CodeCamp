/**
 * Bootstrap shared CLI context: project root, registries, stores, orchestrator.
 */

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AssetStore,
  EngineRegistry,
  ProjectOrchestrator,
  ProjectStore,
  TemplateRegistry,
} from '@video-pipeline/core';
import hfAdapter from '@video-pipeline/adapter-hyperframes';
import { MediaConfigStore } from './media-config.js';

export interface CliContext {
  projectRoot: string;
  engines: EngineRegistry;
  templates: TemplateRegistry;
  projects: ProjectStore;
  assets: AssetStore;
  orchestrator: ProjectOrchestrator;
  templatesDir: string;
  mediaConfig: MediaConfigStore;
}

export function findProjectRoot(start: string = process.cwd()): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, '.video-pipeline'))) return dir;
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'templates'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

function findTemplatesDir(projectRoot: string): string {
  const candidates = [
    join(projectRoot, 'templates'),
    // packages/cli/dist/context.js â†?up 3 levels â†?monorepo root â†?templates/
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'templates'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0]!;
}

export async function bootstrap(opts: { cwd?: string } = {}): Promise<CliContext> {
  const projectRoot = findProjectRoot(opts.cwd);

  const engines = new EngineRegistry();
  engines.register(hfAdapter);

  const templates = new TemplateRegistry();
  const templatesDir = findTemplatesDir(projectRoot);
  await templates.scan(templatesDir);

  const projects = new ProjectStore(projectRoot);
  const assets = new AssetStore({ projectRoot });

  const orchestrator = new ProjectOrchestrator({
    projectRoot,
    engines,
    templates,
    projects,
    assets,
  });

  const mediaConfig = new MediaConfigStore(projectRoot);

  return { projectRoot, engines, templates, projects, assets, orchestrator, templatesDir, mediaConfig };
}

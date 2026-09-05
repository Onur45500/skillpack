import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import {
  MATTpocock_INCLUDED_CATEGORIES,
  type PackConfig,
} from '../../config/packs.js';
import type { CommandEntry, PackSnapshot, SkillEntry } from '../inventory.js';
import {
  pathExists,
  readSkillFile,
  walkFiles,
} from './common.js';

/**
 * Superpowers: flat skills/<name>/SKILL.md
 * Session-start hook → aggressive router.
 * Commands are plugin-namespaced (/superpowers:*) — derived from skill names.
 */
export async function parseSuperpowers(
  rootDir: string,
  config: PackConfig,
  refUsed: string,
  fetchedAt: string,
): Promise<PackSnapshot> {
  const skillsDir = join(rootDir, 'skills');
  if (!(await pathExists(skillsDir))) {
    throw new Error(
      `Superpowers layout drift: expected skills/ under ${rootDir}`,
    );
  }

  const skillFiles = await walkFiles(
    skillsDir,
    (name) => name.toUpperCase() === 'SKILL.MD',
  );

  const skills: SkillEntry[] = [];
  for (const file of skillFiles) {
    const entry = await readSkillFile(file, rootDir);
    if (entry) skills.push(entry);
  }

  if (skills.length === 0) {
    throw new Error(
      'Superpowers parse health check failed: 0 skills found in skills/',
    );
  }

  // Detect hooks
  const hooksDir = join(rootDir, 'hooks');
  const hasHooks = await pathExists(hooksDir);
  const pluginHooks = join(rootDir, '.claude-plugin');
  const hasPluginMeta = await pathExists(pluginHooks);
  // Superpowers is known for session-start injection via using-superpowers
  const hasBootstrap = skills.some(
    (s) =>
      s.name === 'using-superpowers' ||
      s.name.includes('using-superpowers'),
  );
  const hasSessionHook = hasHooks || hasBootstrap || hasPluginMeta;

  const commands: CommandEntry[] = skills.map((s) => ({
    name: s.name,
    slashCommand: `/superpowers:${s.name}`,
    filePath: s.filePath,
  }));

  return {
    packId: 'superpowers',
    repoUrl: config.repoUrl,
    refUsed,
    fetchedAt,
    skills,
    commands,
    hasSessionHook,
    routerStyle: hasSessionHook ? 'aggressive' : 'none',
  };
}

/**
 * Agent Skills: skills/<name>/SKILL.md + .claude/commands/*.md + hooks/
 * Checkpointed router style.
 */
export async function parseAgentSkills(
  rootDir: string,
  config: PackConfig,
  refUsed: string,
  fetchedAt: string,
): Promise<PackSnapshot> {
  const skillsDir = join(rootDir, 'skills');
  if (!(await pathExists(skillsDir))) {
    throw new Error(
      `Agent Skills layout drift: expected skills/ under ${rootDir}`,
    );
  }

  const skillFiles = await walkFiles(
    skillsDir,
    (name) => name.toUpperCase() === 'SKILL.MD',
  );

  const skills: SkillEntry[] = [];
  for (const file of skillFiles) {
    const entry = await readSkillFile(file, rootDir);
    if (entry) skills.push(entry);
  }

  if (skills.length === 0) {
    throw new Error(
      'Agent Skills parse health check failed: 0 skills found in skills/',
    );
  }

  const commands: CommandEntry[] = [];
  const cmdSources: Array<{ abs: string; rel: string }> = [
    { abs: join(rootDir, '.claude', 'commands'), rel: '.claude/commands' },
    { abs: join(rootDir, 'commands'), rel: 'commands' },
  ];
  for (const { abs, rel } of cmdSources) {
    if (!(await pathExists(abs))) continue;
    let entries: string[];
    try {
      entries = await readdir(abs);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!name.endsWith('.md')) continue;
      const base = name.replace(/\.md$/i, '');
      commands.push({
        name: base,
        slashCommand: `/${base}`,
        filePath: `${rel}/${name}`,
      });
    }
  }

  const hasSessionHook =
    (await pathExists(join(rootDir, 'hooks'))) ||
    skills.some((s) => s.name.includes('using-agent-skills'));

  return {
    packId: 'agentSkills',
    repoUrl: config.repoUrl,
    refUsed,
    fetchedAt,
    skills,
    commands,
    hasSessionHook,
    routerStyle: 'checkpointed',
  };
}

/**
 * Matt Pocock: skills/<category>/<name>/SKILL.md
 * Include engineering + productivity; skip deprecated / in-progress / misc.
 * User-invoked by default (disable-model-invocation common).
 */
export async function parseMattPocock(
  rootDir: string,
  config: PackConfig,
  refUsed: string,
  fetchedAt: string,
): Promise<PackSnapshot> {
  const skillsDir = join(rootDir, 'skills');
  if (!(await pathExists(skillsDir))) {
    throw new Error(
      `Matt Pocock layout drift: expected skills/ under ${rootDir}`,
    );
  }

  const included = new Set<string>(MATTpocock_INCLUDED_CATEGORIES);
  const skills: SkillEntry[] = [];

  let categories: string[];
  try {
    categories = await readdir(skillsDir);
  } catch {
    throw new Error(`Cannot read skills/ in ${rootDir}`);
  }

  for (const category of categories) {
    if (!included.has(category)) continue;
    const catDir = join(skillsDir, category);
    const skillFiles = await walkFiles(
      catDir,
      (name) => name.toUpperCase() === 'SKILL.MD',
    );
    for (const file of skillFiles) {
      const entry = await readSkillFile(file, rootDir, category);
      if (entry) skills.push(entry);
    }
  }

  if (skills.length === 0) {
    throw new Error(
      'Matt Pocock parse health check failed: 0 skills in engineering/productivity',
    );
  }

  // Commands = skill names as slash commands (flat install context)
  const commands: CommandEntry[] = skills.map((s) => ({
    name: s.name,
    slashCommand: `/${s.name}`,
    filePath: s.filePath,
  }));

  return {
    packId: 'mattPocock',
    repoUrl: config.repoUrl,
    refUsed,
    fetchedAt,
    skills,
    commands,
    hasSessionHook: false,
    routerStyle: 'none',
  };
}

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

import matter from 'gray-matter';

import type { InvocationMode, SkillEntry } from '../inventory.js';

export async function walkFiles(
  dir: string,
  filter: (name: string) => boolean,
): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        await walk(full);
      } else if (entry.isFile() && filter(entry.name)) {
        results.push(full);
      }
    }
  }

  await walk(dir);
  return results;
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export function detectInvocation(
  data: Record<string, unknown>,
  body: string,
): InvocationMode {
  if (data['disable-model-invocation'] === true) return 'user';
  if (data['disable-model-invocation'] === false) return 'auto';
  if (data['user-invocable'] === true && data['model-invocable'] === false) {
    return 'user';
  }
  // Heuristic from body language
  const lower = body.toLowerCase();
  if (
    lower.includes('only when the user') ||
    lower.includes('user must invoke') ||
    lower.includes('do not auto')
  ) {
    return 'user';
  }
  if (
    lower.includes('always invoke') ||
    lower.includes('1% chance') ||
    lower.includes('aggressively')
  ) {
    return 'auto';
  }
  return 'unknown';
}

export function parseSkillMd(
  content: string,
  filePath: string,
  rootDir: string,
  category?: string,
): SkillEntry | null {
  const { data, content: body } = matter(content);
  const name =
    typeof data.name === 'string' && data.name.trim()
      ? data.name.trim()
      : null;
  if (!name) return null;

  const description =
    typeof data.description === 'string' ? data.description.trim() : '';

  const slashCommand =
    typeof data['slash-command'] === 'string'
      ? data['slash-command']
      : typeof data.command === 'string'
        ? data.command
        : undefined;

  return {
    name,
    description,
    filePath: relative(rootDir, filePath).replace(/\\/g, '/'),
    category,
    invocation: detectInvocation(data as Record<string, unknown>, body),
    slashCommand,
  };
}

export async function readSkillFile(
  filePath: string,
  rootDir: string,
  category?: string,
): Promise<SkillEntry | null> {
  const content = await readFile(filePath, 'utf8');
  return parseSkillMd(content, filePath, rootDir, category);
}

export { join, relative };

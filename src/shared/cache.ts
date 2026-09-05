import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';

import {
  parseInventory,
  type SkillPackInventory,
} from './inventory.js';

export function defaultCacheDir(): string {
  return (
    process.env.SKILLPACK_CACHE_DIR ??
    join(homedir(), '.cache', 'skillpack')
  );
}

export function inventoryCachePath(cacheDir: string = defaultCacheDir()): string {
  return join(cacheDir, 'inventory.json');
}

export async function readCachedInventory(
  cacheDir: string = defaultCacheDir(),
): Promise<SkillPackInventory | null> {
  const path = inventoryCachePath(cacheDir);
  try {
    await access(path);
    const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
    const inv = parseInventory(raw);
    return { ...inv, source: 'cache' };
  } catch {
    return null;
  }
}

export async function writeCachedInventory(
  inventory: SkillPackInventory,
  cacheDir: string = defaultCacheDir(),
): Promise<string> {
  await mkdir(cacheDir, { recursive: true });
  const path = inventoryCachePath(cacheDir);
  const toWrite: SkillPackInventory = { ...inventory, source: 'cache' };
  await writeFile(path, JSON.stringify(toWrite, null, 2), 'utf8');
  return path;
}

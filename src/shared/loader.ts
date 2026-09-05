import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseInventory,
  type SkillPackInventory,
} from './inventory.js';
import { readCachedInventory } from './cache.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve path to bundled data/inventory.json across src and dist layouts. */
export function bundledInventoryPath(): string {
  // Prefer explicit env override (tests / monorepo)
  if (process.env.SKILLPACK_BUNDLED_INVENTORY) {
    return process.env.SKILLPACK_BUNDLED_INVENTORY;
  }
  // dist/index.js → ../data/inventory.json
  // src/shared/loader.ts → ../../data/inventory.json
  const candidates = [
    join(__dirname, '..', '..', 'data', 'inventory.json'),
    join(__dirname, '..', 'data', 'inventory.json'),
    join(process.cwd(), 'data', 'inventory.json'),
  ];
  return candidates[0]!;
}

export async function loadBundledInventory(): Promise<SkillPackInventory> {
  const path = bundledInventoryPath();
  // Try multiple candidates
  const candidates = [
    process.env.SKILLPACK_BUNDLED_INVENTORY,
    join(__dirname, '..', '..', 'data', 'inventory.json'),
    join(__dirname, '..', 'data', 'inventory.json'),
    join(process.cwd(), 'data', 'inventory.json'),
  ].filter((p): p is string => Boolean(p));

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const raw = JSON.parse(await readFile(candidate, 'utf8')) as unknown;
      const inv = parseInventory(raw);
      return { ...inv, source: 'bundled' };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Could not load bundled inventory. Last error: ${String(lastError)}`,
  );
}

export interface LoadOptions {
  /** Prefer cache over bundled when available */
  preferCache?: boolean;
  cacheDir?: string;
}

/**
 * Resolve inventory: cache (if present) → bundled fallback.
 * Never hits the network. Callers that want live data use map fetch.
 */
export async function loadInventory(
  options: LoadOptions = {},
): Promise<{ inventory: SkillPackInventory; provenance: string }> {
  const preferCache = options.preferCache !== false;

  if (preferCache) {
    const cached = await readCachedInventory(options.cacheDir);
    if (cached) {
      return {
        inventory: cached,
        provenance: `using cached snapshot from ${cached.generatedAt}; run skillpack map fetch --refresh for live data`,
      };
    }
  }

  const bundled = await loadBundledInventory();
  return {
    inventory: bundled,
    provenance: `using bundled snapshot from ${bundled.generatedAt}; run skillpack map fetch --refresh for live data`,
  };
}

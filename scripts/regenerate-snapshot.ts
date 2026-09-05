/**
 * Regenerate data/inventory.json from live GitHub tarballs.
 * Requires network. Not run in CI.
 *
 *   npm run regenerate-snapshot
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchAllPacks } from '../src/shared/fetcher.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'data', 'inventory.json');

const inventory = await fetchAllPacks({
  onProgress: (msg) => console.log(msg),
});

inventory.source = 'bundled';
await writeFile(out, JSON.stringify(inventory, null, 2) + '\n', 'utf8');
console.log(`Wrote ${out}`);
console.log(
  `Counts: SP=${inventory.packs.superpowers.skills.length} AS=${inventory.packs.agentSkills.skills.length} MP=${inventory.packs.mattPocock.skills.length}`,
);

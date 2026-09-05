import pc from 'picocolors';

import { PACKS, type PackId } from '../config/packs.js';
import { writeCachedInventory, readCachedInventory } from '../shared/cache.js';
import { fetchAllPacks } from '../shared/fetcher.js';

export async function runMapFetch(options: {
  refresh?: boolean;
}): Promise<void> {
  if (!options.refresh) {
    const cached = await readCachedInventory();
    if (cached) {
      for (const packId of Object.keys(PACKS) as PackId[]) {
        const snap = cached.packs[packId];
        console.log(
          pc.dim(
            `using cached snapshot for ${PACKS[packId].displayName} from ${snap.fetchedAt} (${snap.skills.length} skills), use --refresh to update.`,
          ),
        );
      }
      console.log(
        pc.green(
          `\n✓ Cache ready (${Object.values(cached.packs).reduce((n, p) => n + p.skills.length, 0)} skills total). Run skillpack map diff or skillpack pick.`,
        ),
      );
      return;
    }
  }

  const inventory = await fetchAllPacks({
    onProgress: (msg) => console.log(msg),
  });
  const path = await writeCachedInventory(inventory);
  console.log(pc.green(`\n✓ Inventory saved to ${path}`));
}

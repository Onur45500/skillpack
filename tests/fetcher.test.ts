import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PACKS } from '../src/config/packs.js';
import { fetchAllPacks } from '../src/shared/fetcher.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

describe('fetcher (mocked network)', () => {
  it('builds inventory via injected resolve/download without network', async () => {
    const inventory = await fetchAllPacks({
      resolveShaFn: async () => 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      downloadTarballFn: async (owner, _repo, _sha, _dest) => {
        if (owner === 'obra') return join(fixtures, 'superpowers');
        if (owner === 'addyosmani') return join(fixtures, 'agent-skills');
        if (owner === 'mattpocock') return join(fixtures, 'matt-pocock');
        throw new Error(`unexpected owner ${owner}`);
      },
      workDir: join(fixtures, '..', '.tmp-fetch-work'),
    });

    expect(inventory.source).toBe('live');
    expect(inventory.packs.superpowers.skills.length).toBeGreaterThan(0);
    expect(inventory.packs.agentSkills.commands.length).toBeGreaterThan(0);
    expect(inventory.packs.mattPocock.skills.every((s) => s.invocation === 'user')).toBe(
      true,
    );
    expect(PACKS.superpowers.repoUrl).toContain('obra/superpowers');
  });
});

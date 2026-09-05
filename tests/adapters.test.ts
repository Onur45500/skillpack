import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PACKS } from '../src/config/packs.js';
import {
  parseAgentSkills,
  parseMattPocock,
  parseSuperpowers,
} from '../src/shared/adapters/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const now = '2026-03-01T00:00:00.000Z';

describe('adapters', () => {
  it('parses Superpowers flat skills/ layout + session hook', async () => {
    const snap = await parseSuperpowers(
      join(root, 'superpowers'),
      PACKS.superpowers,
      'abc',
      now,
    );
    expect(snap.skills.length).toBe(2);
    expect(snap.skills.map((s) => s.name).sort()).toEqual([
      'brainstorming',
      'using-superpowers',
    ]);
    expect(snap.hasSessionHook).toBe(true);
    expect(snap.routerStyle).toBe('aggressive');
    expect(snap.commands[0]?.slashCommand).toMatch(/^\/superpowers:/);
  });

  it('parses Agent Skills skills + .claude/commands', async () => {
    const snap = await parseAgentSkills(
      join(root, 'agent-skills'),
      PACKS.agentSkills,
      'def',
      now,
    );
    expect(snap.skills.length).toBe(2);
    expect(snap.commands.map((c) => c.slashCommand).sort()).toEqual([
      '/plan',
      '/spec',
    ]);
    expect(snap.routerStyle).toBe('checkpointed');
    expect(snap.hasSessionHook).toBe(true);
  });

  it('parses Matt Pocock category buckets and skips deprecated', async () => {
    const snap = await parseMattPocock(
      join(root, 'matt-pocock'),
      PACKS.mattPocock,
      'ghi',
      now,
    );
    expect(snap.skills.map((s) => s.name).sort()).toEqual([
      'grill-me',
      'tdd',
      'writing-great-skills',
    ]);
    expect(snap.skills.every((s) => s.invocation === 'user')).toBe(true);
    expect(snap.skills.find((s) => s.name === 'old-skill')).toBeUndefined();
    expect(snap.routerStyle).toBe('none');
  });

  it('fails loudly when 0 skills found (layout drift)', async () => {
    await expect(
      parseSuperpowers(
        join(root, 'empty-pack'),
        PACKS.superpowers,
        'x',
        now,
      ),
    ).rejects.toThrow(/0 skills/);
  });
});

import { describe, expect, it } from 'vitest';

import { computeDiff, safeCherryPicks } from '../src/shared/diff.js';
import type { SkillPackInventory } from '../src/shared/inventory.js';

function makeInventory(): SkillPackInventory {
  return {
    generatedAt: '2026-03-01T00:00:00.000Z',
    source: 'bundled',
    packs: {
      superpowers: {
        packId: 'superpowers',
        repoUrl: 'https://github.com/obra/superpowers',
        refUsed: 'aaa',
        fetchedAt: '2026-03-01T00:00:00.000Z',
        hasSessionHook: true,
        routerStyle: 'aggressive',
        commands: [
          {
            name: 'test-driven-development',
            slashCommand: '/superpowers:test-driven-development',
            filePath: 'skills/tdd/SKILL.md',
          },
        ],
        skills: [
          {
            name: 'test-driven-development',
            description: 'Enforce TDD before implementation code',
            filePath: 'skills/test-driven-development/SKILL.md',
            invocation: 'auto',
          },
          {
            name: 'using-git-worktrees',
            description: 'Create isolated git worktree environments',
            filePath: 'skills/using-git-worktrees/SKILL.md',
            invocation: 'auto',
          },
          {
            name: 'unique-superpower',
            description: 'Something only Superpowers has',
            filePath: 'skills/unique-superpower/SKILL.md',
            invocation: 'auto',
          },
        ],
      },
      agentSkills: {
        packId: 'agentSkills',
        repoUrl: 'https://github.com/addyosmani/agent-skills',
        refUsed: 'bbb',
        fetchedAt: '2026-03-01T00:00:00.000Z',
        hasSessionHook: true,
        routerStyle: 'checkpointed',
        commands: [
          { name: 'spec', slashCommand: '/spec', filePath: '.claude/commands/spec.md' },
          { name: 'plan', slashCommand: '/plan', filePath: '.claude/commands/plan.md' },
        ],
        skills: [
          {
            name: 'test-driven-development',
            description: 'TDD workflow with human checkpoints — tests are proof',
            filePath: 'skills/test-driven-development/SKILL.md',
            invocation: 'auto',
          },
          {
            name: 'architecture-review',
            description: 'Review architecture and fight context decay',
            filePath: 'skills/architecture-review/SKILL.md',
            invocation: 'auto',
          },
          {
            name: 'unique-agent',
            description: 'Something only Agent Skills has',
            filePath: 'skills/unique-agent/SKILL.md',
            invocation: 'auto',
          },
        ],
      },
      mattPocock: {
        packId: 'mattPocock',
        repoUrl: 'https://github.com/mattpocock/skills',
        refUsed: 'ccc',
        fetchedAt: '2026-03-01T00:00:00.000Z',
        hasSessionHook: false,
        routerStyle: 'none',
        commands: [
          { name: 'grill-me', slashCommand: '/grill-me', filePath: 'skills/engineering/grill-me/SKILL.md' },
          { name: 'spec', slashCommand: '/spec', filePath: 'skills/engineering/spec/SKILL.md' },
        ],
        skills: [
          {
            name: 'grill-me',
            description: 'Grill the user on requirements until edge cases resolve',
            filePath: 'skills/engineering/grill-me/SKILL.md',
            category: 'engineering',
            invocation: 'user',
          },
          {
            name: 'git-worktree',
            description: 'Create a git worktree for isolated work',
            filePath: 'skills/engineering/git-worktree/SKILL.md',
            category: 'engineering',
            invocation: 'user',
          },
          {
            name: 'unique-pocock',
            description: 'Something only Pocock has',
            filePath: 'skills/engineering/unique-pocock/SKILL.md',
            category: 'engineering',
            invocation: 'user',
          },
        ],
      },
    },
  };
}

describe('diff engine', () => {
  it('finds unique skills, overlaps, and upgraded conflicts', () => {
    const diff = computeDiff(makeInventory());

    expect(diff.unique.some((u) => u.skill.name === 'unique-superpower')).toBe(
      true,
    );
    expect(diff.unique.some((u) => u.skill.name === 'grill-me')).toBe(true);

    expect(
      diff.overlapping.some(
        (o) =>
          (o.a.skill.name === 'test-driven-development' &&
            o.b.skill.name === 'test-driven-development') ||
          (o.b.skill.name === 'test-driven-development' &&
            o.a.skill.name === 'test-driven-development'),
      ),
    ).toBe(true);

    // False-positive guard: different *-driven-development stems must not overlap
    expect(
      diff.overlapping.some(
        (o) =>
          (o.a.skill.name === 'using-git-worktrees' &&
            o.b.skill.name.includes('driven')) ||
          (o.b.skill.name === 'using-git-worktrees' &&
            o.a.skill.name.includes('driven')),
      ),
    ).toBe(false);

    const kinds = new Set(diff.conflicts.map((c) => c.kind));
    expect(kinds.has('router')).toBe(true);
    expect(kinds.has('flat-name-collision')).toBe(true);
    expect(kinds.has('command-collision')).toBe(true); // /spec across AS + MP
    expect(kinds.has('trigger-overlap')).toBe(true);
  });

  it('safeCherryPicks excludes colliding names for primary', () => {
    const inv = makeInventory();
    const picks = safeCherryPicks(inv, 'superpowers', 5);
    const names = picks.map((p) => p.skill.name);
    expect(names).toContain('grill-me');
    const tdd = picks.find((p) => p.skill.name === 'test-driven-development');
    if (tdd) expect(tdd.skip).toBe(true);
  });
});

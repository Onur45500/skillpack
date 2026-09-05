import { describe, expect, it } from 'vitest';

import {
  levenshtein,
  nameSimilarity,
  normalizeName,
  sharedKeywords,
  stemName,
} from '../src/shared/similarity.js';

describe('similarity helpers', () => {
  it('normalizes names', () => {
    expect(normalizeName('/Test Driven Development')).toBe(
      'test-driven-development',
    );
  });

  it('stems boilerplate suffixes', () => {
    expect(stemName('test-driven-development')).toBe('test');
    expect(stemName('subagent-driven-development')).toBe('subagent');
    expect(stemName('spec-driven-development')).toBe('spec');
  });

  it('computes levenshtein and name similarity', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(nameSimilarity('tdd', 'tdd')).toBe(1);
    expect(
      nameSimilarity('test-driven-development', 'test-driven-development'),
    ).toBe(1);
    expect(nameSimilarity('abc', 'xyz')).toBe(0);
    expect(
      nameSimilarity('git-worktree', 'using-git-worktrees'),
    ).toBeGreaterThan(0.5);
    expect(
      nameSimilarity('requesting-code-review', 'request-code-review'),
    ).toBeGreaterThan(0.7);
  });

  it('rejects false-positive *-driven-development pairs', () => {
    expect(
      nameSimilarity('subagent-driven-development', 'spec-driven-development'),
    ).toBe(0);
    expect(
      nameSimilarity('subagent-driven-development', 'test-driven-development'),
    ).toBe(0);
    expect(
      nameSimilarity('spec-driven-development', 'test-driven-development'),
    ).toBe(0);
  });

  it('finds shared keywords', () => {
    const kws = sharedKeywords(
      'Enforce TDD and plan before code',
      'TDD workflow with plan checkpoints',
      ['tdd', 'plan', 'ship'],
    );
    expect(kws).toContain('tdd');
    expect(kws).toContain('plan');
  });
});

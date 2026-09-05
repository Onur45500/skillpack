import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { diffToJson } from '../src/map/diff.js';
import { renderHtml } from '../src/map/html.js';
import { buildRecommendation } from '../src/pick/output.js';
import { computeDiff } from '../src/shared/diff.js';
import { parseInventory } from '../src/shared/inventory.js';
import { loadBundledInventory } from '../src/shared/loader.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('acceptance', () => {
  it('bundled inventory parses and has skills in all packs', async () => {
    process.env.SKILLPACK_BUNDLED_INVENTORY = join(
      repoRoot,
      'data',
      'inventory.json',
    );
    const inv = await loadBundledInventory();
    expect(inv.packs.superpowers.skills.length).toBeGreaterThan(0);
    expect(inv.packs.agentSkills.skills.length).toBeGreaterThan(0);
    expect(inv.packs.mattPocock.skills.length).toBeGreaterThan(0);
  });

  it('map diff --json shape has unique, overlapping, collisions non-empty', async () => {
    const raw = JSON.parse(
      await readFile(join(repoRoot, 'data', 'inventory.json'), 'utf8'),
    );
    const inv = parseInventory(raw);
    const diff = computeDiff(inv);
    const json = diffToJson(diff);
    expect(json.unique.length).toBeGreaterThan(0);
    expect(json.overlapping.length).toBeGreaterThan(0);
    expect(json.collisions.length).toBeGreaterThan(0);
  });

  it('map html is self-contained with no external CDN refs', async () => {
    const raw = JSON.parse(
      await readFile(join(repoRoot, 'data', 'inventory.json'), 'utf8'),
    );
    const inv = parseInventory(raw);
    const diff = computeDiff(inv);
    const html = renderHtml(inv, diff, 'using bundled snapshot');
    expect(html).toContain('<!DOCTYPE html>');
    // No external stylesheets/scripts/fonts
    expect(html).not.toMatch(/<link[^>]+href=["']https?:\/\//i);
    expect(html).not.toMatch(/<script[^>]+src=["']https?:\/\//i);
    expect(html).not.toMatch(/url\(\s*['"]?https?:\/\//i);
  });

  it('pick --answers produces deterministic Superpowers recommendation', async () => {
    const answers = JSON.parse(
      await readFile(
        join(repoRoot, 'examples', 'barrel-through-solo.json'),
        'utf8',
      ),
    );
    const inv = parseInventory(
      JSON.parse(
        await readFile(join(repoRoot, 'data', 'inventory.json'), 'utf8'),
      ),
    );
    const rec = buildRecommendation(
      answers,
      { ...inv, source: 'bundled' },
      'using bundled snapshot from 2026-03-01',
    );
    expect(rec.framework).toBe('superpowers');
    expect(rec.cherryPicks.length).toBeGreaterThan(0);
    expect(rec.installPrimary.claudeCode).toContain('superpowers');
    expect(rec.rationale.length).toBeGreaterThan(20);
  });
});

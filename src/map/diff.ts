import pc from 'picocolors';

import { PACKS, type PackId } from '../config/packs.js';
import { computeDiff, type DiffResult } from '../shared/diff.js';
import { loadInventory } from '../shared/loader.js';

function packLabel(id: PackId): string {
  return PACKS[id].displayName;
}

function printTable(
  title: string,
  color: (s: string) => string,
  rows: string[][],
): void {
  console.log('\n' + color(pc.bold(title)));
  console.log(color('─'.repeat(Math.min(60, title.length + 4))));
  if (rows.length === 0) {
    console.log(pc.dim('  (none)'));
    return;
  }
  for (const row of rows) {
    console.log('  ' + row.join('  |  '));
  }
}

export function formatDiffTerminal(diff: DiffResult, provenance: string): void {
  console.log(pc.dim(provenance));
  console.log(
    pc.dim(
      `snapshot ${diff.generatedAt} · source=${diff.source}`,
    ),
  );

  const uniqueRows = diff.unique.map((u) => [
    pc.green('✓'),
    packLabel(u.packId),
    u.skill.name,
  ]);
  printTable('Unique skills (safe, no conflict)', pc.green, uniqueRows);

  const overlapRows = diff.overlapping.map((o) => [
    pc.yellow('~'),
    `${o.a.skill.name} (${packLabel(o.a.packId)})`,
    '↔',
    `${o.b.skill.name} (${packLabel(o.b.packId)})`,
    o.reason === 'keywords'
      ? `keywords: ${(o.keywords ?? []).join(', ')}`
      : `name≈${o.score.toFixed(2)}`,
  ]);
  printTable(
    'Overlapping concepts (redundant, usually fine)',
    pc.yellow,
    overlapRows,
  );

  const conflictRows = diff.conflicts.map((c) => [
    c.severity === 'red' ? pc.red('✗') : pc.yellow('!'),
    c.kind,
    c.message,
  ]);
  printTable(
    'Conflicts (router / trigger / flat-install / commands)',
    pc.red,
    conflictRows,
  );
}

export function diffToJson(diff: DiffResult) {
  return {
    generatedAt: diff.generatedAt,
    source: diff.source,
    unique: diff.unique.map((u) => ({
      packId: u.packId,
      name: u.skill.name,
      description: u.skill.description,
      invocation: u.skill.invocation,
    })),
    overlapping: diff.overlapping.map((o) => ({
      a: { packId: o.a.packId, name: o.a.skill.name },
      b: { packId: o.b.packId, name: o.b.skill.name },
      reason: o.reason,
      score: o.score,
      keywords: o.keywords,
    })),
    collisions: diff.conflicts.filter((c) => c.severity === 'red'),
    conflicts: diff.conflicts,
  };
}

export async function runMapDiff(options: {
  json?: boolean;
  failOnCollision?: boolean;
}): Promise<number> {
  const { inventory, provenance } = await loadInventory();
  const diff = computeDiff(inventory);

  if (options.json) {
    console.log(JSON.stringify(diffToJson(diff), null, 2));
  } else {
    formatDiffTerminal(diff, provenance);
  }

  const hasRed = diff.conflicts.some((c) => c.severity === 'red');
  if (options.failOnCollision && hasRed) return 1;
  return 0;
}

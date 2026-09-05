import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { PACKS, PACK_IDS, type PackId } from '../config/packs.js';
import { computeDiff, type DiffResult } from '../shared/diff.js';
import { loadInventory } from '../shared/loader.js';
import { normalizeName } from '../shared/similarity.js';
import type { SkillPackInventory } from '../shared/inventory.js';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function classifySkill(
  packId: PackId,
  skillName: string,
  diff: DiffResult,
): 'unique' | 'overlap' | 'conflict' {
  const norm = normalizeName(skillName);
  for (const c of diff.conflicts) {
    if (c.severity !== 'red') continue;
    if (
      c.skills?.some(
        (s) => s.packId === packId && normalizeName(s.name) === norm,
      )
    ) {
      return 'conflict';
    }
  }
  for (const o of diff.overlapping) {
    if (
      (o.a.packId === packId && normalizeName(o.a.skill.name) === norm) ||
      (o.b.packId === packId && normalizeName(o.b.skill.name) === norm)
    ) {
      return 'overlap';
    }
  }
  return 'unique';
}

function vennSvg(diff: DiffResult, inventory: SkillPackInventory): string {
  const counts = {
    superpowers: inventory.packs.superpowers.skills.length,
    agentSkills: inventory.packs.agentSkills.skills.length,
    mattPocock: inventory.packs.mattPocock.skills.length,
  };
  const uniqueCounts = {
    superpowers: diff.unique.filter((u) => u.packId === 'superpowers').length,
    agentSkills: diff.unique.filter((u) => u.packId === 'agentSkills').length,
    mattPocock: diff.unique.filter((u) => u.packId === 'mattPocock').length,
  };
  const shared = diff.overlapping.length;
  const collisions = diff.conflicts.filter((c) => c.severity === 'red').length;

  return `
<svg viewBox="0 0 480 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Skill pack Venn summary">
  <circle cx="160" cy="100" r="70" fill="#16a34a" fill-opacity="0.25" stroke="#16a34a" stroke-width="2"/>
  <circle cx="240" cy="100" r="70" fill="#ca8a04" fill-opacity="0.25" stroke="#ca8a04" stroke-width="2"/>
  <circle cx="200" cy="150" r="70" fill="#2563eb" fill-opacity="0.25" stroke="#2563eb" stroke-width="2"/>
  <text x="130" y="85" font-family="system-ui,sans-serif" font-size="12" fill="#14532d">SP unique</text>
  <text x="130" y="102" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#14532d">${uniqueCounts.superpowers}</text>
  <text x="250" y="85" font-family="system-ui,sans-serif" font-size="12" fill="#713f12">AS unique</text>
  <text x="250" y="102" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#713f12">${uniqueCounts.agentSkills}</text>
  <text x="175" y="175" font-family="system-ui,sans-serif" font-size="12" fill="#1e3a8a">MP unique</text>
  <text x="185" y="192" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#1e3a8a">${uniqueCounts.mattPocock}</text>
  <text x="330" y="60" font-family="system-ui,sans-serif" font-size="13" fill="#334155">Totals</text>
  <text x="330" y="82" font-family="system-ui,sans-serif" font-size="12" fill="#475569">SP: ${counts.superpowers} · AS: ${counts.agentSkills} · MP: ${counts.mattPocock}</text>
  <text x="330" y="104" font-family="system-ui,sans-serif" font-size="12" fill="#ca8a04">Overlaps: ${shared}</text>
  <text x="330" y="126" font-family="system-ui,sans-serif" font-size="12" fill="#dc2626">Conflicts: ${collisions}</text>
</svg>`;
}

export function renderHtml(
  inventory: SkillPackInventory,
  diff: DiffResult,
  provenance: string,
): string {
  const columns = PACK_IDS.map((packId) => {
    const snap = inventory.packs[packId];
    const items = snap.skills
      .map((skill) => {
        const cls = classifySkill(packId, skill.name, diff);
        return `<li class="${cls}"><strong>${escapeHtml(skill.name)}</strong><span>${escapeHtml(skill.description.slice(0, 120))}</span></li>`;
      })
      .join('\n');
    return `
      <section class="pack">
        <h2>${escapeHtml(PACKS[packId].displayName)}</h2>
        <p class="meta">${snap.skills.length} skills · ref ${escapeHtml(snap.refUsed.slice(0, 7))} · ${escapeHtml(snap.fetchedAt)}</p>
        <ul>${items}</ul>
      </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>skillpack map</title>
<style>
  :root {
    --bg: #0f172a;
    --panel: #1e293b;
    --text: #e2e8f0;
    --muted: #94a3b8;
    --unique: #16a34a;
    --overlap: #ca8a04;
    --conflict: #dc2626;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", system-ui, sans-serif;
    background: linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    color: var(--text);
    min-height: 100vh;
    padding: 2rem;
  }
  h1 { margin: 0 0 0.25rem; font-size: 1.75rem; letter-spacing: -0.02em; }
  .sub { color: var(--muted); margin-bottom: 1.5rem; font-size: 0.9rem; }
  .venn { background: var(--panel); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; max-width: 520px; }
  .legend { display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.85rem; }
  .legend span::before {
    content: "";
    display: inline-block;
    width: 0.75rem; height: 0.75rem;
    border-radius: 2px;
    margin-right: 0.35rem;
    vertical-align: middle;
  }
  .legend .u::before { background: var(--unique); }
  .legend .o::before { background: var(--overlap); }
  .legend .c::before { background: var(--conflict); }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  @media (max-width: 900px) {
    .grid { grid-template-columns: 1fr; }
  }
  .pack {
    background: var(--panel);
    border-radius: 12px;
    padding: 1rem 1.1rem;
  }
  .pack h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
  .meta { color: var(--muted); font-size: 0.75rem; margin: 0 0 0.75rem; }
  ul { list-style: none; margin: 0; padding: 0; }
  li {
    border-left: 3px solid var(--unique);
    padding: 0.45rem 0.6rem;
    margin-bottom: 0.4rem;
    background: rgba(15, 23, 42, 0.45);
    border-radius: 0 6px 6px 0;
  }
  li.overlap { border-left-color: var(--overlap); }
  li.conflict { border-left-color: var(--conflict); }
  li strong { display: block; font-size: 0.9rem; }
  li span { display: block; color: var(--muted); font-size: 0.75rem; margin-top: 0.15rem; }
  footer {
    margin-top: 2rem;
    color: var(--muted);
    font-size: 0.8rem;
    border-top: 1px solid #334155;
    padding-top: 1rem;
  }
</style>
</head>
<body>
  <h1>skillpack map</h1>
  <p class="sub">${escapeHtml(provenance)}</p>
  <div class="legend">
    <span class="u">Unique</span>
    <span class="o">Overlapping</span>
    <span class="c">Conflict</span>
  </div>
  <div class="venn">${vennSvg(diff, inventory)}</div>
  <div class="grid">
    ${columns}
  </div>
  <footer>
    Generated ${escapeHtml(diff.generatedAt)} · source=${escapeHtml(diff.source)} ·
    refs:
    ${PACK_IDS.map((id) => `${PACKS[id].displayName}=${escapeHtml(inventory.packs[id].refUsed.slice(0, 7))}`).join(' · ')}
    <br/>This report goes stale as packs evolve. Refresh with <code>skillpack map fetch --refresh</code>.
  </footer>
</body>
</html>`;
}

export async function runMapHtml(options: {
  output?: string;
}): Promise<string> {
  const { inventory, provenance } = await loadInventory();
  const diff = computeDiff(inventory);
  const html = renderHtml(inventory, diff, provenance);
  const outPath = resolve(options.output ?? 'skillpack-map.html');
  await writeFile(outPath, html, 'utf8');
  console.log(`Wrote ${outPath}`);
  return outPath;
}

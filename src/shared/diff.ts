import { OVERLAP_KEYWORDS, PACK_IDS, type PackId } from '../config/packs.js';
import type {
  PackSnapshot,
  SkillEntry,
  SkillPackInventory,
} from './inventory.js';
import {
  nameSimilarity,
  normalizeName,
  sharedKeywords,
} from './similarity.js';

export interface UniqueSkill {
  packId: PackId;
  skill: SkillEntry;
}

export interface OverlapPair {
  a: { packId: PackId; skill: SkillEntry };
  b: { packId: PackId; skill: SkillEntry };
  reason: 'name' | 'keywords';
  score: number;
  keywords?: string[];
}

export type ConflictKind =
  | 'router'
  | 'trigger-overlap'
  | 'flat-name-collision'
  | 'command-collision';

export interface Conflict {
  kind: ConflictKind;
  severity: 'red' | 'yellow';
  packs: PackId[];
  message: string;
  skills?: Array<{ packId: PackId; name: string }>;
}

export interface DiffResult {
  unique: UniqueSkill[];
  overlapping: OverlapPair[];
  conflicts: Conflict[];
  generatedAt: string;
  source: SkillPackInventory['source'];
}

const NAME_SIMILARITY_THRESHOLD = 0.72;

function allSkillRefs(
  inventory: SkillPackInventory,
): Array<{ packId: PackId; skill: SkillEntry }> {
  const out: Array<{ packId: PackId; skill: SkillEntry }> = [];
  for (const packId of PACK_IDS) {
    for (const skill of inventory.packs[packId].skills) {
      out.push({ packId, skill });
    }
  }
  return out;
}

function findOverlaps(inventory: SkillPackInventory): OverlapPair[] {
  const refs = allSkillRefs(inventory);
  const pairs: OverlapPair[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < refs.length; i++) {
    for (let j = i + 1; j < refs.length; j++) {
      const a = refs[i]!;
      const b = refs[j]!;
      if (a.packId === b.packId) continue;

      const key = [a.packId, a.skill.name, b.packId, b.skill.name]
        .map(normalizeName)
        .sort()
        .join('|');
      if (seen.has(key)) continue;

      const sim = nameSimilarity(a.skill.name, b.skill.name);
      if (sim >= NAME_SIMILARITY_THRESHOLD) {
        seen.add(key);
        pairs.push({ a, b, reason: 'name', score: sim });
        continue;
      }

      const kws = sharedKeywords(
        a.skill.description,
        b.skill.description,
        OVERLAP_KEYWORDS,
      );
      if (kws.length >= 2) {
        seen.add(key);
        pairs.push({
          a,
          b,
          reason: 'keywords',
          score: kws.length / OVERLAP_KEYWORDS.length,
          keywords: kws,
        });
      }
    }
  }
  return pairs;
}

function findUnique(
  inventory: SkillPackInventory,
  overlapping: OverlapPair[],
): UniqueSkill[] {
  const overlapped = new Set<string>();
  for (const pair of overlapping) {
    overlapped.add(`${pair.a.packId}:${normalizeName(pair.a.skill.name)}`);
    overlapped.add(`${pair.b.packId}:${normalizeName(pair.b.skill.name)}`);
  }

  const unique: UniqueSkill[] = [];
  for (const packId of PACK_IDS) {
    for (const skill of inventory.packs[packId].skills) {
      const key = `${packId}:${normalizeName(skill.name)}`;
      if (!overlapped.has(key)) {
        unique.push({ packId, skill });
      }
    }
  }
  return unique;
}

function findConflicts(inventory: SkillPackInventory): Conflict[] {
  const conflicts: Conflict[] = [];
  const packs = PACK_IDS.map((id) => inventory.packs[id]);

  // Router / session-hook conflicts: two packs both claiming process ownership
  const routers = packs.filter(
    (p) => p.hasSessionHook && p.routerStyle !== 'none',
  );
  if (routers.length >= 2) {
    conflicts.push({
      kind: 'router',
      severity: 'red',
      packs: routers.map((p) => p.packId),
      message: `Router conflict: ${routers
        .map((p) => `${p.packId} (${p.routerStyle})`)
        .join(' + ')} both inject session/process ownership. Use only ONE as primary router.`,
    });
  }

  // Flat-install name collisions (exact normalized name across packs)
  const byName = new Map<string, Array<{ packId: PackId; skill: SkillEntry }>>();
  for (const packId of PACK_IDS) {
    for (const skill of inventory.packs[packId].skills) {
      const key = normalizeName(skill.name);
      const list = byName.get(key) ?? [];
      list.push({ packId, skill });
      byName.set(key, list);
    }
  }
  for (const [name, list] of byName) {
    const distinctPacks = new Set(list.map((l) => l.packId));
    if (distinctPacks.size >= 2) {
      conflicts.push({
        kind: 'flat-name-collision',
        severity: 'red',
        packs: [...distinctPacks],
        message: `Flat-install name collision on "${name}" — copying into ~/.claude/skills/ or project skills/ will clash.`,
        skills: list.map((l) => ({ packId: l.packId, name: l.skill.name })),
      });
    }
  }

  // Auto-invocation trigger overlap: two auto/unknown skills with high name similarity
  const autoSkills = allSkillRefs(inventory).filter(
    (r) => r.skill.invocation === 'auto' || r.skill.invocation === 'unknown',
  );
  const triggerSeen = new Set<string>();
  for (let i = 0; i < autoSkills.length; i++) {
    for (let j = i + 1; j < autoSkills.length; j++) {
      const a = autoSkills[i]!;
      const b = autoSkills[j]!;
      if (a.packId === b.packId) continue;
      const sim = nameSimilarity(a.skill.name, b.skill.name);
      if (sim < NAME_SIMILARITY_THRESHOLD) continue;
      const key = [a.packId, a.skill.name, b.packId, b.skill.name]
        .map(normalizeName)
        .sort()
        .join('|');
      if (triggerSeen.has(key)) continue;
      triggerSeen.add(key);
      conflicts.push({
        kind: 'trigger-overlap',
        severity:
          a.skill.invocation === 'auto' && b.skill.invocation === 'auto'
            ? 'red'
            : 'yellow',
        packs: [a.packId, b.packId],
        message: `Auto-invocation trigger overlap: "${a.skill.name}" (${a.packId}) ↔ "${b.skill.name}" (${b.packId})`,
        skills: [
          { packId: a.packId, name: a.skill.name },
          { packId: b.packId, name: b.skill.name },
        ],
      });
    }
  }

  // Exact slash-command collisions (un-namespaced only — namespaced ones don't collide)
  const byCmd = new Map<string, Array<{ packId: PackId; cmd: string }>>();
  for (const packId of PACK_IDS) {
    for (const cmd of inventory.packs[packId].commands) {
      // Skip plugin-namespaced commands like /superpowers:foo
      if (cmd.slashCommand.includes(':')) continue;
      const key = cmd.slashCommand.toLowerCase();
      const list = byCmd.get(key) ?? [];
      list.push({ packId, cmd: cmd.slashCommand });
      byCmd.set(key, list);
    }
  }
  for (const [cmd, list] of byCmd) {
    const distinctPacks = new Set(list.map((l) => l.packId));
    if (distinctPacks.size >= 2) {
      conflicts.push({
        kind: 'command-collision',
        severity: 'red',
        packs: [...distinctPacks],
        message: `Slash-command collision on ${cmd}`,
        skills: list.map((l) => ({ packId: l.packId, name: l.cmd })),
      });
    }
  }

  return conflicts;
}

export function computeDiff(inventory: SkillPackInventory): DiffResult {
  const overlapping = findOverlaps(inventory);
  const unique = findUnique(inventory, overlapping);
  const conflicts = findConflicts(inventory);
  return {
    unique,
    overlapping,
    conflicts,
    generatedAt: inventory.generatedAt,
    source: inventory.source,
  };
}

/** Skills from non-primary packs that are safe to cherry-pick alongside primary. */
export function safeCherryPicks(
  inventory: SkillPackInventory,
  primary: PackId,
  limit = 5,
): Array<{
  packId: PackId;
  skill: SkillEntry;
  reason: string;
  skip?: boolean;
  skipReason?: string;
}> {
  const diff = computeDiff(inventory);
  const conflictedNames = new Set<string>();
  for (const c of diff.conflicts) {
    if (c.severity !== 'red') continue;
    if (!c.packs.includes(primary)) continue;
    for (const s of c.skills ?? []) {
      if (s.packId !== primary) {
        conflictedNames.add(`${s.packId}:${normalizeName(s.name)}`);
      }
    }
  }
  // Also mark exact name collisions with primary
  const primaryNames = new Set(
    inventory.packs[primary].skills.map((s) => normalizeName(s.name)),
  );

  const results: Array<{
    packId: PackId;
    skill: SkillEntry;
    reason: string;
    skip?: boolean;
    skipReason?: string;
  }> = [];

  for (const packId of PACK_IDS) {
    if (packId === primary) continue;
    for (const skill of inventory.packs[packId].skills) {
      const key = `${packId}:${normalizeName(skill.name)}`;
      const collides =
        primaryNames.has(normalizeName(skill.name)) ||
        conflictedNames.has(key);

      // Prefer user-invoked skills from other packs (safer alongside a router)
      const isGoodCandidate =
        skill.invocation === 'user' ||
        !diff.overlapping.some(
          (o) =>
            (o.a.packId === packId &&
              normalizeName(o.a.skill.name) === normalizeName(skill.name) &&
              o.b.packId === primary) ||
            (o.b.packId === packId &&
              normalizeName(o.b.skill.name) === normalizeName(skill.name) &&
              o.a.packId === primary),
        );

      if (collides) {
        results.push({
          packId,
          skill,
          reason: '',
          skip: true,
          skipReason: `collides with ${primary}'s skill of the same/similar name`,
        });
      } else if (isGoodCandidate) {
        results.push({
          packId,
          skill,
          reason: `no command collision, fills a gap ${primary} doesn't cover`,
        });
      }
    }
  }

  // Prefer non-skips, user-invoked first, then trim
  results.sort((a, b) => {
    if (a.skip && !b.skip) return 1;
    if (!a.skip && b.skip) return -1;
    if (a.skill.invocation === 'user' && b.skill.invocation !== 'user') return -1;
    if (b.skill.invocation === 'user' && a.skill.invocation !== 'user') return 1;
    return a.skill.name.localeCompare(b.skill.name);
  });

  // Take up to `limit` safe picks, and include at least one skip example if available
  const safe = results.filter((r) => !r.skip).slice(0, limit);
  const oneSkip = results.find((r) => r.skip);
  if (oneSkip && safe.length < limit + 1) {
    return [...safe, oneSkip];
  }
  return safe;
}

export function packHasRedConflicts(
  diff: DiffResult,
  packA: PackId,
  packB: PackId,
): boolean {
  return diff.conflicts.some(
    (c) =>
      c.severity === 'red' &&
      c.packs.includes(packA) &&
      c.packs.includes(packB),
  );
}

export type { PackSnapshot };

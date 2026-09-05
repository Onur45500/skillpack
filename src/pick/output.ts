import * as p from '@clack/prompts';
import pc from 'picocolors';

import { PACKS, type PackId } from '../config/packs.js';
import { safeCherryPicks } from '../shared/diff.js';
import type { SkillPackInventory } from '../shared/inventory.js';
import { loadInventory } from '../shared/loader.js';
import { QUESTIONS, type QuestionId } from './scoring-rules.js';
import {
  scoreAnswers,
  validateAnswers,
  type Answers,
  type ScoreBreakdown,
} from './scoring.js';

export interface Recommendation {
  framework: PackId;
  displayName: string;
  scores: Record<PackId, number>;
  tied: PackId[];
  rationale: string;
  cherryPicks: Array<{
    packId: PackId;
    skillName: string;
    description: string;
    ok: boolean;
    detail: string;
    caveat?: string;
    install: { claudeCode: string; other: string };
  }>;
  installPrimary: { claudeCode: string; other: string };
  provenance: string;
  generatedAt: string;
}

function buildRationale(
  winner: PackId,
  breakdown: ScoreBreakdown,
  _answers: Answers,
): string {
  const name = PACKS[winner].displayName;
  const labels: string[] = [];

  for (const driver of breakdown.rationaleDrivers) {
    if (!driver.contributed.includes(winner)) continue;
    if (!labels.includes(driver.optionLabel)) {
      labels.push(driver.optionLabel);
    }
  }

  const uniqueBits = labels.slice(0, 3);
  let text: string;
  if (uniqueBits.length === 0) {
    text = `${name} scored highest on your answers.`;
  } else if (uniqueBits.length === 1) {
    text = `You chose "${uniqueBits[0]}" — ${name} fits that directly.`;
  } else {
    const last = uniqueBits[uniqueBits.length - 1];
    const head = uniqueBits.slice(0, -1).map((l) => `"${l}"`).join(', ');
    text = `You chose ${head}, and "${last}" — ${name} fits that profile directly.`;
  }

  if (breakdown.tied.length > 1) {
    text += ` It was close with ${breakdown.tied
      .filter((t) => t !== winner)
      .map((t) => PACKS[t].displayName)
      .join(' and ')}; tie-break preferred ${name}.`;
  }
  return text;
}

export function buildRecommendation(
  answers: Answers,
  inventory: SkillPackInventory,
  provenance: string,
): Recommendation {
  validateAnswers(answers);
  const breakdown = scoreAnswers(answers);
  const winner = breakdown.winner;
  const picks = safeCherryPicks(inventory, winner, 5);

  const cherryPicks = picks.map((pick) => {
    const cfg = PACKS[pick.packId];
    return {
      packId: pick.packId,
      skillName: pick.skill.name,
      description: pick.skill.description,
      ok: !pick.skip,
      detail: pick.skip
        ? `SKIP: ${pick.skipReason}`
        : pick.reason,
      caveat: cfg.cherryPickCaveat,
      install: cfg.installSkill(pick.skill.name),
    };
  });

  return {
    framework: winner,
    displayName: PACKS[winner].displayName,
    scores: breakdown.scores,
    tied: breakdown.tied,
    rationale: buildRationale(winner, breakdown, answers),
    cherryPicks,
    installPrimary: PACKS[winner].installPrimary,
    provenance,
    generatedAt: inventory.generatedAt,
  };
}

export function printRecommendation(rec: Recommendation): void {
  console.log();
  console.log(pc.bold('Your primary router: ') + pc.bold(pc.cyan(rec.displayName)));
  console.log();
  console.log(pc.dim(rec.rationale));
  console.log();
  console.log(pc.bold('Safe to cherry-pick alongside ' + rec.displayName + ':'));
  for (const pick of rec.cherryPicks) {
    const from = PACKS[pick.packId].displayName;
    if (pick.ok) {
      console.log(
        pc.green(`  ✓ ${pick.skillName}`) +
          pc.dim(` (from ${from}) — ${pick.detail}`),
      );
    } else {
      console.log(
        pc.red(`  ✗ ${pick.skillName}`) +
          pc.dim(` (from ${from}) — ${pick.detail}`),
      );
    }
  }
  console.log();
  console.log(pc.bold('Install snippets'));
  console.log(pc.dim('# Primary — Claude Code'));
  console.log(rec.installPrimary.claudeCode);
  console.log(pc.dim('# Primary — Cursor / Codex / other'));
  console.log(rec.installPrimary.other);
  for (const pick of rec.cherryPicks.filter((p) => p.ok).slice(0, 3)) {
    console.log(pc.dim(`# Cherry-pick ${pick.skillName}`));
    console.log(pick.install.claudeCode);
  }
  console.log();
  console.log(pc.dim(rec.provenance));
}

export async function runInteractiveQuiz(): Promise<Answers> {
  p.intro(pc.bgCyan(pc.black(' skillpack pick ')));
  const answers: Answers = {};
  const total = QUESTIONS.length;

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i]!;
    const value = await p.select({
      message: `Question ${i + 1} of ${total} — ${q.prompt}`,
      options: q.options.map((o) => ({
        value: o.id,
        label: o.label,
      })),
    });
    if (p.isCancel(value)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }
    answers[q.id as QuestionId] = value as string;
  }
  return answers;
}

export async function runPick(options: {
  yes?: boolean;
  answersPath?: string;
  json?: boolean;
}): Promise<void> {
  const { inventory, provenance } = await loadInventory();

  let answers: Answers;
  if (options.answersPath) {
    const { readFile } = await import('node:fs/promises');
    const raw = JSON.parse(await readFile(options.answersPath, 'utf8')) as Answers;
    answers = raw;
  } else if (options.yes) {
    throw new Error('--yes requires --answers <file.json>');
  } else {
    answers = await runInteractiveQuiz();
  }

  const rec = buildRecommendation(answers, inventory, provenance);

  if (options.json) {
    console.log(JSON.stringify(rec, null, 2));
  } else {
    if (!options.answersPath) {
      p.outro('Recommendation ready');
    }
    printRecommendation(rec);
  }
}

import type { PackId } from '../config/packs.js';
import {
  QUESTIONS,
  QUESTIONS_BY_ID,
  TIE_BREAK_ORDER,
  type QuestionId,
} from './scoring-rules.js';

export type Answers = Partial<Record<QuestionId, string>>;

export interface ScoreBreakdown {
  scores: Record<PackId, number>;
  winner: PackId;
  tied: PackId[];
  rationaleDrivers: Array<{
    questionId: QuestionId;
    optionId: string;
    optionLabel: string;
    contributed: PackId[];
  }>;
}

export function scoreAnswers(answers: Answers): ScoreBreakdown {
  const scores: Record<PackId, number> = {
    superpowers: 0,
    agentSkills: 0,
    mattPocock: 0,
  };
  const rationaleDrivers: ScoreBreakdown['rationaleDrivers'] = [];

  for (const question of QUESTIONS) {
    const optionId = answers[question.id];
    if (!optionId) continue;
    const option = question.options.find((o) => o.id === optionId);
    if (!option) {
      throw new Error(
        `Unknown option "${optionId}" for question "${question.id}"`,
      );
    }
    const contributed: PackId[] = [];
    for (const [packId, pts] of Object.entries(option.scores) as Array<
      [PackId, number]
    >) {
      scores[packId] += pts;
      contributed.push(packId);
    }
    rationaleDrivers.push({
      questionId: question.id,
      optionId: option.id,
      optionLabel: option.label,
      contributed,
    });
  }

  const max = Math.max(...Object.values(scores));
  const tied = (Object.keys(scores) as PackId[]).filter(
    (id) => scores[id] === max,
  );

  let winner: PackId;
  if (tied.length === 1) {
    winner = tied[0]!;
  } else {
    winner =
      TIE_BREAK_ORDER.find((id) => tied.includes(id)) ?? tied[0]!;
  }

  return { scores, winner, tied, rationaleDrivers };
}

export function validateAnswers(answers: Answers): void {
  for (const q of QUESTIONS) {
    const opt = answers[q.id];
    if (!opt) {
      throw new Error(`Missing answer for question "${q.id}"`);
    }
    if (!QUESTIONS_BY_ID[q.id].options.some((o) => o.id === opt)) {
      throw new Error(`Invalid option "${opt}" for question "${q.id}"`);
    }
  }
}

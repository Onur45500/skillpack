import type { PackId } from '../config/packs.js';

export type QuestionId =
  | 'autonomy'
  | 'team'
  | 'pain'
  | 'platform'
  | 'ownership'
  | 'tokenBudget';

export interface QuestionOption {
  id: string;
  label: string;
  /** Points awarded to each pack when this option is chosen */
  scores: Partial<Record<PackId, number>>;
}

export interface Question {
  id: QuestionId;
  prompt: string;
  options: QuestionOption[];
}

/**
 * Quiz questions + scoring weights.
 * Edit this file to retune recommendations as packs evolve.
 *
 * Tie-break priority (documented, deterministic):
 *   agentSkills > superpowers > mattPocock
 * (enterprise/process completeness wins close calls)
 */
export const TIE_BREAK_ORDER: PackId[] = [
  'agentSkills',
  'superpowers',
  'mattPocock',
];

export const QUESTIONS: Question[] = [
  {
    id: 'autonomy',
    prompt:
      'Do you want the agent to barrel through with minimal check-ins, or stop for approval at each phase?',
    options: [
      {
        id: 'barrel',
        label: 'Barrel through',
        scores: { superpowers: 3, mattPocock: 1 },
      },
      {
        id: 'checkpoints',
        label: 'Stop for checkpoints',
        scores: { agentSkills: 3 },
      },
      {
        id: 'mixed',
        label: 'Depends on the task',
        scores: { mattPocock: 2, agentSkills: 1 },
      },
    ],
  },
  {
    id: 'team',
    prompt: 'Solo developer, small team, or larger team with defined review processes?',
    options: [
      {
        id: 'solo',
        label: 'Solo',
        scores: { mattPocock: 2, superpowers: 2 },
      },
      {
        id: 'small',
        label: 'Small team',
        scores: { superpowers: 2, agentSkills: 1, mattPocock: 1 },
      },
      {
        id: 'large',
        label: 'Larger team + reviews',
        // Includes eval/CI lean toward Agent Skills
        scores: { agentSkills: 4 },
      },
    ],
  },
  {
    id: 'pain',
    prompt:
      "What's going wrong today: skips tests, misunderstands requirements, or knowledge decays over long work?",
    options: [
      {
        id: 'skips-tests',
        label: 'Skips tests / rushes code',
        scores: { superpowers: 3 },
      },
      {
        id: 'misunderstands',
        label: 'Misreads requirements',
        scores: { mattPocock: 3 },
      },
      {
        id: 'decay',
        label: 'Context decays over time',
        scores: { agentSkills: 3 },
      },
    ],
  },
  {
    id: 'platform',
    prompt:
      'Claude Code only, or do you also need Cursor / Codex / Gemini CLI / others?',
    options: [
      {
        id: 'claude-only',
        label: 'Claude Code only',
        scores: { mattPocock: 2, superpowers: 1 },
      },
      {
        id: 'multi',
        label: 'Multiple agent CLIs',
        scores: { superpowers: 2, agentSkills: 2 },
      },
    ],
  },
  {
    id: 'ownership',
    prompt:
      'Want a framework that owns the whole workflow, or keep control and borrow pieces?',
    options: [
      {
        id: 'owns',
        label: 'Owns the workflow',
        scores: { superpowers: 2, agentSkills: 2 },
      },
      {
        id: 'borrow',
        label: 'Borrow individual pieces',
        scores: { mattPocock: 3 },
      },
    ],
  },
  {
    id: 'tokenBudget',
    prompt: 'Is your context window / token budget a real constraint right now?',
    options: [
      {
        id: 'tight',
        label: 'Yes, keep it lean',
        scores: { mattPocock: 3, agentSkills: 1 },
      },
      {
        id: 'fine',
        label: 'Not a concern',
        scores: { superpowers: 2, agentSkills: 1 },
      },
    ],
  },
];

export const QUESTIONS_BY_ID = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
) as Record<QuestionId, Question>;

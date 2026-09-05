import { describe, expect, it } from 'vitest';

import { TIE_BREAK_ORDER } from '../src/pick/scoring-rules.js';
import { scoreAnswers, type Answers } from '../src/pick/scoring.js';

const barrelThroughSolo: Answers = {
  autonomy: 'barrel',
  team: 'solo',
  pain: 'skips-tests',
  platform: 'multi',
  ownership: 'owns',
  tokenBudget: 'fine',
};

const checkpointTeam: Answers = {
  autonomy: 'checkpoints',
  team: 'large',
  pain: 'decay',
  platform: 'multi',
  ownership: 'owns',
  tokenBudget: 'tight',
};

const borrowPieces: Answers = {
  autonomy: 'mixed',
  team: 'solo',
  pain: 'misunderstands',
  platform: 'claude-only',
  ownership: 'borrow',
  tokenBudget: 'tight',
};

describe('scoring', () => {
  it('recommends Superpowers for barrel-through solo TDD pain', () => {
    const result = scoreAnswers(barrelThroughSolo);
    expect(result.winner).toBe('superpowers');
  });

  it('recommends Agent Skills for checkpointed large teams', () => {
    const result = scoreAnswers(checkpointTeam);
    expect(result.winner).toBe('agentSkills');
  });

  it('recommends Matt Pocock for borrow-pieces / grill requirements', () => {
    const result = scoreAnswers(borrowPieces);
    expect(result.winner).toBe('mattPocock');
  });

  it('breaks ties deterministically via TIE_BREAK_ORDER', () => {
    // Force a synthetic tie by only answering platform:multi (2+2)
    const tied = scoreAnswers({
      platform: 'multi',
    });
    expect(tied.tied.length).toBeGreaterThan(1);
    expect(tied.winner).toBe(
      TIE_BREAK_ORDER.find((id) => tied.tied.includes(id)),
    );
  });

  it('changing a weight in scoring-rules flips the recommended framework', async () => {
    // Import the live question table and temporarily bump Agent Skills weight
    const { QUESTIONS } = await import('../src/pick/scoring-rules.js');
    const answers: Answers = {
      autonomy: 'barrel',
      team: 'large',
      pain: 'skips-tests',
      platform: 'multi',
      ownership: 'owns',
      tokenBudget: 'fine',
    };

    const before = scoreAnswers(answers);
    expect(before.winner).toBe('superpowers');

    const teamQ = QUESTIONS.find((q) => q.id === 'team');
    const large = teamQ?.options.find((o) => o.id === 'large');
    expect(large).toBeDefined();
    const original = large!.scores.agentSkills ?? 0;
    large!.scores.agentSkills = 20; // dramatic weight flip

    try {
      const after = scoreAnswers(answers);
      expect(after.winner).toBe('agentSkills');
      expect(after.winner).not.toBe(before.winner);
    } finally {
      large!.scores.agentSkills = original;
    }
  });
});

/**
 * Pack registry — repo URLs, install snippets, and keyword lists.
 * Edit this file (not logic) when frameworks evolve.
 */

export type PackId = 'superpowers' | 'agentSkills' | 'mattPocock';

export interface PackConfig {
  id: PackId;
  displayName: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  repoUrl: string;
  /** Install the whole pack as primary router */
  installPrimary: {
    claudeCode: string;
    other: string;
  };
  /** Install a single skill by name */
  installSkill: (skillName: string) => {
    claudeCode: string;
    other: string;
  };
  /** Caveat shown when cherry-picking from this pack */
  cherryPickCaveat?: string;
}

export const PACKS: Record<PackId, PackConfig> = {
  superpowers: {
    id: 'superpowers',
    displayName: 'Superpowers',
    owner: 'obra',
    repo: 'superpowers',
    defaultBranch: 'main',
    repoUrl: 'https://github.com/obra/superpowers',
    installPrimary: {
      claudeCode: '/plugin install superpowers@claude-plugins-official',
      other: 'npx skills add obra/superpowers',
    },
    installSkill: (skillName) => ({
      claudeCode: `npx skills add obra/superpowers --skill ${skillName}`,
      other: `npx skills add obra/superpowers --skill ${skillName}`,
    }),
  },
  agentSkills: {
    id: 'agentSkills',
    displayName: 'Agent Skills',
    owner: 'addyosmani',
    repo: 'agent-skills',
    defaultBranch: 'main',
    repoUrl: 'https://github.com/addyosmani/agent-skills',
    installPrimary: {
      claudeCode: 'npx skills add addyosmani/agent-skills',
      other: 'npx skills add addyosmani/agent-skills',
    },
    installSkill: (skillName) => ({
      claudeCode: `npx skills add addyosmani/agent-skills --skill ${skillName}`,
      other: `npx skills add addyosmani/agent-skills --skill ${skillName}`,
    }),
    cherryPickCaveat:
      'Per-skill install may omit shared references/ (see addyosmani/agent-skills#361). Prefer whole-repo install when possible.',
  },
  mattPocock: {
    id: 'mattPocock',
    displayName: "Matt Pocock's skills",
    owner: 'mattpocock',
    repo: 'skills',
    defaultBranch: 'main',
    repoUrl: 'https://github.com/mattpocock/skills',
    installPrimary: {
      claudeCode: 'claude plugins install mattpocock-skills',
      other: 'npx skills@latest add mattpocock/skills',
    },
    installSkill: (skillName) => ({
      claudeCode: `npx skills@latest add mattpocock/skills --skill ${skillName}`,
      other: `npx skills@latest add mattpocock/skills --skill ${skillName}`,
    }),
  },
};

export const PACK_IDS: PackId[] = ['superpowers', 'agentSkills', 'mattPocock'];

/**
 * Significant keywords used for description-overlap detection.
 * Keep short and domain-specific; edit as packs evolve.
 */
export const OVERLAP_KEYWORDS: string[] = [
  'tdd',
  'test-driven',
  'brainstorm',
  'plan',
  'review',
  'debug',
  'architecture',
  'spec',
  'prd',
  'ship',
  'deploy',
  'security',
  'performance',
  'refactor',
  'grill',
  'interview',
  'verify',
  'worktree',
  'subagent',
  'code-review',
  'accessibility',
];

/** Categories included when parsing Matt Pocock's repo */
export const MATTpocock_INCLUDED_CATEGORIES = ['engineering', 'productivity'] as const;

/** Categories explicitly skipped */
export const MATTpocock_SKIPPED_CATEGORIES = [
  'deprecated',
  'in-progress',
  'misc',
] as const;

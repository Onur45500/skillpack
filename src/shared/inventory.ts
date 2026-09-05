import { z } from 'zod';

import type { PackId } from '../config/packs.js';

export type InvocationMode = 'user' | 'auto' | 'unknown';
export type RouterStyle = 'aggressive' | 'checkpointed' | 'none';

export interface SkillEntry {
  name: string;
  description: string;
  filePath: string;
  category?: string;
  invocation: InvocationMode;
  /** Flat-install slash command if discoverable, e.g. "/tdd" */
  slashCommand?: string;
}

export interface CommandEntry {
  name: string;
  /** e.g. "/spec", "/superpowers:brainstorming" */
  slashCommand: string;
  filePath: string;
}

export interface PackSnapshot {
  packId: PackId;
  repoUrl: string;
  refUsed: string;
  fetchedAt: string;
  skills: SkillEntry[];
  commands: CommandEntry[];
  hasSessionHook: boolean;
  routerStyle: RouterStyle;
}

export interface SkillPackInventory {
  generatedAt: string;
  source: 'bundled' | 'cache' | 'live';
  packs: {
    superpowers: PackSnapshot;
    agentSkills: PackSnapshot;
    mattPocock: PackSnapshot;
  };
}

const InvocationSchema = z.enum(['user', 'auto', 'unknown']);
const RouterStyleSchema = z.enum(['aggressive', 'checkpointed', 'none']);

const SkillEntrySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  filePath: z.string(),
  category: z.string().optional(),
  invocation: InvocationSchema,
  slashCommand: z.string().optional(),
});

const CommandEntrySchema = z.object({
  name: z.string().min(1),
  slashCommand: z.string().min(1),
  filePath: z.string(),
});

const PackSnapshotSchema = z.object({
  packId: z.enum(['superpowers', 'agentSkills', 'mattPocock']),
  repoUrl: z.string().url(),
  refUsed: z.string().min(1),
  fetchedAt: z.string(),
  skills: z.array(SkillEntrySchema),
  commands: z.array(CommandEntrySchema),
  hasSessionHook: z.boolean(),
  routerStyle: RouterStyleSchema,
});

export const SkillPackInventorySchema = z.object({
  generatedAt: z.string(),
  source: z.enum(['bundled', 'cache', 'live']),
  packs: z.object({
    superpowers: PackSnapshotSchema,
    agentSkills: PackSnapshotSchema,
    mattPocock: PackSnapshotSchema,
  }),
});

export function parseInventory(raw: unknown): SkillPackInventory {
  return SkillPackInventorySchema.parse(raw);
}

export function skillCount(inventory: SkillPackInventory): number {
  return (
    inventory.packs.superpowers.skills.length +
    inventory.packs.agentSkills.skills.length +
    inventory.packs.mattPocock.skills.length
  );
}

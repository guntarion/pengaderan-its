/**
 * src/lib/pairing/index.ts
 * Barrel exports for the pairing algorithm library (M03).
 */

export { generateBuddyPairs, ALGORITHM_VERSION } from './buddy-algorithm';
export { suggestKasuhForMaba, computeJaccard } from './kasuh-matchmaking';
export { assignMabasToKPGroups } from './kp-group-assignment';
export { applyNegativeConstraints } from './constraints';
export type {
  BuddyInput,
  MabaInput,
  KasuhInput,
  KPAssignInput,
  KPGroupDescriptor,
  BuddyPairResult,
  BuddyGenerationResult,
  BuddyGenerationOptions,
  KasuhMatchResult,
  KasuhMatchSuggestion,
  KasuhMatchOptions,
  KPGroupAssignment,
  KPGroupStats,
  KPGroupAssignResult,
  KPAssignOptions,
  ScoreBreakdown,
  ReasonBuilder,
} from './types';
export type { ConflictEntry } from './constraints';

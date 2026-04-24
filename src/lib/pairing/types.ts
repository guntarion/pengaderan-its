/**
 * src/lib/pairing/types.ts
 * TypeScript types for the pairing algorithm library (M03).
 * Strict types — no `any`.
 */

// ============================================================
// Input Types
// ============================================================

/** Maba input for Buddy Pair generation */
export interface BuddyInput {
  userId: string;
  isRantau: boolean;
  isKIP: boolean;
  cohortId: string;
  displayName?: string;
}

/** Maba input for Kasuh matchmaking */
export interface MabaInput {
  userId: string;
  interests: string[];
  province: string | null;
  prodi: string | null;
  cohortId: string;
}

/** Kasuh candidate for matchmaking */
export interface KasuhInput {
  userId: string;
  interests: string[];
  province: string | null;
  prodi: string | null;
  currentAssignmentCount: number;
  status: 'ACTIVE' | 'DEACTIVATED';
}

/** Maba input for KP Group assignment */
export interface KPAssignInput {
  userId: string;
  isRantau: boolean;
  isKIP: boolean;
  displayName: string;
  nrp?: string | null;
}

/** KP Group descriptor for assignment */
export interface KPGroupDescriptor {
  id: string;
  code: string;
  capacityTarget: number;
  capacityMax: number;
}

// ============================================================
// Output Types
// ============================================================

/** Score breakdown for Kasuh matchmaking */
export interface ScoreBreakdown {
  jaccardScore: number;
  provinceBonus: number;
  prodiBonus: number;
  totalScore: number;
}

/** Reason why a pair was made */
export type ReasonBuilder =
  | 'lokal-rantau mix'
  | 'intra-lokal fallback'
  | 'intra-rantau fallback'
  | 'odd-count triple'
  | 'manual override';

/** One buddy pair result */
export interface BuddyPairResult {
  userAId: string;
  userBId: string;
  userCId?: string;     // only for triple pairs
  reasonForPairing: ReasonBuilder;
  isCrossDemographic: boolean;
  isTriple: boolean;
}

/** Full output from generateBuddyPairs */
export interface BuddyGenerationResult {
  pairs: BuddyPairResult[];
  metadata: {
    algorithmVersion: string;
    seed: string;
    inputCount: number;
    pairCount: number;
    crossDemographicCount: number;
    crossRatio: number;
    unpaired: string[];       // userIds that could not be paired (oddStrategy='unassigned')
    tripleCount: number;
    inputHash: string;        // SHA-256 of sorted input userIds
  };
}

/** One kasuh match suggestion */
export interface KasuhMatchSuggestion {
  kasuhUserId: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: string[];
  lowMatch: boolean;
}

/** Full output for one maba from suggestKasuhForMaba */
export interface KasuhMatchResult {
  mabaUserId: string;
  topSuggestions: KasuhMatchSuggestion[];  // Top-3 max
}

/** Assignment of one maba to one KP Group */
export interface KPGroupAssignment {
  userId: string;
  kpGroupId: string;
}

/** Stats per KP Group after assignment */
export interface KPGroupStats {
  kpGroupId: string;
  code: string;
  totalCount: number;
  rantauCount: number;
  lokalCount: number;
  kipCount: number;
}

/** Full output from assignMabasToKPGroups */
export interface KPGroupAssignResult {
  assignments: KPGroupAssignment[];
  groupStats: KPGroupStats[];
  metadata: {
    mode: 'round-robin' | 'random-seeded' | 'stratified';
    seed?: string;
    inputCount: number;
    groupCount: number;
    inputHash: string;
  };
}

// ============================================================
// Options Types
// ============================================================

export interface BuddyGenerationOptions {
  seed: string;
  algorithmVersion: string;
  oddStrategy?: 'triple' | 'unassigned';  // default: 'triple'
}

export interface KasuhMatchOptions {
  topK?: number;         // default: 3
  lowMatchThreshold?: number;  // default: 0.1
}

export interface KPAssignOptions {
  mode: 'round-robin' | 'random-seeded' | 'stratified';
  seed?: string;         // required for 'random-seeded'
}

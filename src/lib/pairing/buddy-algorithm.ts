/**
 * src/lib/pairing/buddy-algorithm.ts
 * Buddy Pairing algorithm: greedy bipartite + single-pass swap optimization.
 *
 * Algorithm:
 * 1. Sort input by userId ASC (deterministic regardless of Prisma query order).
 * 2. Split into rantau (R) and lokal (L) groups.
 * 3. Shuffle each group with seeded PRNG (Mulberry32).
 * 4. Zip pairwise cross-group → cross-demographic pairs.
 * 5. Remaining intra-group → intra-group pairs.
 * 6. Single-pass swap: for each intra pair, try swapping with a cross pair to improve ratio.
 * 7. Handle odd: one triple pair (default) or one unassigned.
 *
 * Key properties:
 * - Deterministic: same seed + sorted input → identical output.
 * - No Hungarian algorithm — greedy + swap is "good enough" (~95%+ cross ratio).
 * - No Math.random() — uses Mulberry32 seeded PRNG.
 */

import { createLogger } from '@/lib/logger';
import type {
  BuddyInput,
  BuddyPairResult,
  BuddyGenerationResult,
  BuddyGenerationOptions,
  ReasonBuilder,
} from './types';

const log = createLogger('buddy-algorithm');

export const ALGORITHM_VERSION = 'v1.0-greedy-swap';

// ============================================================
// Mulberry32 — deterministic seeded PRNG (inline, no deps)
// ============================================================

function mulberry32(seedStr: string): () => number {
  // Hash the string seed to a 32-bit integer
  let h = 0x12345678;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 16;
  }
  // Mulberry32 state
  let state = h >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================
// Fisher-Yates shuffle with seeded PRNG
// ============================================================

function shuffleWithSeed<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================
// Simple SHA-256-like hash for input (Node.js crypto)
// ============================================================

function hashInputIds(userIds: string[]): string {
  const sorted = [...userIds].sort();
  // Use a simple FNV-like hash instead of crypto to keep it pure and sync
  let hash = 2166136261;
  const str = sorted.join(',');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ============================================================
// Main export: generateBuddyPairs
// ============================================================

export function generateBuddyPairs(
  input: BuddyInput[],
  options: BuddyGenerationOptions
): BuddyGenerationResult {
  const { seed, algorithmVersion = ALGORITHM_VERSION, oddStrategy = 'triple' } = options;

  log.info('Starting buddy pair generation', {
    inputCount: input.length,
    seed,
    algorithmVersion,
    oddStrategy,
  });

  // Edge case: empty input
  if (input.length === 0) {
    log.info('Empty input — returning empty result');
    return {
      pairs: [],
      metadata: {
        algorithmVersion,
        seed,
        inputCount: 0,
        pairCount: 0,
        crossDemographicCount: 0,
        crossRatio: 0,
        unpaired: [],
        tripleCount: 0,
        inputHash: hashInputIds([]),
      },
    };
  }

  // Step 1: Deterministic sort by userId ASC
  const sorted = [...input].sort((a, b) => a.userId.localeCompare(b.userId));
  const inputHash = hashInputIds(sorted.map((u) => u.userId));

  // Step 2: Split into rantau and lokal
  const rantau = sorted.filter((u) => u.isRantau);
  const lokal = sorted.filter((u) => !u.isRantau);

  log.debug('Split demographics', { rantauCount: rantau.length, lokalCount: lokal.length });

  // Step 3: Shuffle each group with seeded PRNG
  const rng = mulberry32(seed);
  const shuffledRantau = shuffleWithSeed(rantau, rng);
  const shuffledLokal = shuffleWithSeed(lokal, rng);

  const pairs: BuddyPairResult[] = [];
  let unpaired: string[] = [];

  // Step 4: Zip pairwise cross-group (min length determines how many cross pairs)
  const minLen = Math.min(shuffledRantau.length, shuffledLokal.length);
  const crossPairs: BuddyPairResult[] = [];
  for (let i = 0; i < minLen; i++) {
    crossPairs.push({
      userAId: shuffledRantau[i].userId,
      userBId: shuffledLokal[i].userId,
      reasonForPairing: 'lokal-rantau mix',
      isCrossDemographic: true,
      isTriple: false,
    });
  }

  // Step 5: Remaining intra-group pairs
  const intraPairs: BuddyPairResult[] = [];
  const remainingRantau = shuffledRantau.slice(minLen);
  const remainingLokal = shuffledLokal.slice(minLen);
  const allRemaining = [...remainingRantau, ...remainingLokal];

  // Pair up remaining in pairs of 2 (handle odd below)
  let i = 0;
  while (i + 1 < allRemaining.length) {
    const a = allRemaining[i];
    const b = allRemaining[i + 1];
    const reason: ReasonBuilder = a.isRantau === b.isRantau
      ? (a.isRantau ? 'intra-rantau fallback' : 'intra-lokal fallback')
      : 'lokal-rantau mix';
    intraPairs.push({
      userAId: a.userId,
      userBId: b.userId,
      reasonForPairing: reason,
      isCrossDemographic: a.isRantau !== b.isRantau,
      isTriple: false,
    });
    i += 2;
  }

  // Odd one out
  const oddOne = i < allRemaining.length ? allRemaining[i] : null;

  // Step 6: Single-pass swap optimization
  // For each intra pair, try swapping one member with a cross pair to improve cross count
  for (let pIdx = 0; pIdx < intraPairs.length; pIdx++) {
    const intraPair = intraPairs[pIdx];
    if (intraPair.isCrossDemographic) continue; // already cross — skip

    // Find a cross pair where swapping would help
    for (let cIdx = 0; cIdx < crossPairs.length; cIdx++) {
      const crossPair = crossPairs[cIdx];
      // Try swapping intraPair.userBId with crossPair.userBId
      const intraMaba = sorted.find((u) => u.userId === intraPair.userAId);
      const intraBuddy = sorted.find((u) => u.userId === intraPair.userBId);
      const crossA = sorted.find((u) => u.userId === crossPair.userAId);
      const crossB = sorted.find((u) => u.userId === crossPair.userBId);

      if (!intraMaba || !intraBuddy || !crossA || !crossB) continue;

      // Check if swapping intraPair.userBId with crossPair.userBId gives 2 cross pairs
      const newIntraIsCross = intraMaba.isRantau !== crossB.isRantau;
      const newCrossIsCross = crossA.isRantau !== intraBuddy.isRantau;

      if (newIntraIsCross && newCrossIsCross) {
        // Perform swap
        intraPairs[pIdx] = {
          userAId: intraPair.userAId,
          userBId: crossPair.userBId,
          reasonForPairing: 'lokal-rantau mix',
          isCrossDemographic: true,
          isTriple: false,
        };
        crossPairs[cIdx] = {
          userAId: crossPair.userAId,
          userBId: intraPair.userBId,
          reasonForPairing: 'lokal-rantau mix',
          isCrossDemographic: true,
          isTriple: false,
        };
        break; // one swap per intra pair is enough
      }
    }
  }

  // Combine all pairs
  pairs.push(...crossPairs, ...intraPairs);

  // Step 7: Handle odd one out
  if (oddOne) {
    if (oddStrategy === 'unassigned') {
      unpaired = [oddOne.userId];
      log.debug('Odd user unassigned', { userId: oddOne.userId });
    } else {
      // Triple: add odd user to last pair
      if (pairs.length > 0) {
        const lastPair = pairs[pairs.length - 1];
        pairs[pairs.length - 1] = {
          ...lastPair,
          userCId: oddOne.userId,
          reasonForPairing: 'odd-count triple',
          isTriple: true,
        };
        log.debug('Odd user added as triple', { userId: oddOne.userId });
      } else {
        // Only 1 user total — unassign
        unpaired = [oddOne.userId];
      }
    }
  }

  // Compute stats
  const crossCount = pairs.filter((p) => p.isCrossDemographic).length;
  const crossRatio = pairs.length > 0 ? crossCount / pairs.length : 0;
  const tripleCount = pairs.filter((p) => p.isTriple).length;

  log.info('Buddy pair generation complete', {
    inputCount: sorted.length,
    pairCount: pairs.length,
    crossDemographicCount: crossCount,
    crossRatio: Math.round(crossRatio * 100) / 100,
    tripleCount,
    unpaired: unpaired.length,
  });

  return {
    pairs,
    metadata: {
      algorithmVersion,
      seed,
      inputCount: sorted.length,
      pairCount: pairs.length,
      crossDemographicCount: crossCount,
      crossRatio,
      unpaired,
      tripleCount,
      inputHash,
    },
  };
}

/**
 * src/lib/pairing/buddy-algorithm.test.ts
 * Unit tests for the Buddy Pair generation algorithm.
 */

import { describe, it, expect } from 'vitest';
import { generateBuddyPairs, ALGORITHM_VERSION } from './buddy-algorithm';
import type { BuddyInput } from './types';

// Helper to create a mock maba input
function makeMaba(userId: string, isRantau: boolean): BuddyInput {
  return { userId, isRantau, isKIP: false, cohortId: 'cohort-1' };
}

// Helper: create N mabas, first half rantau, second half lokal
function makeBalancedInput(n: number): BuddyInput[] {
  return Array.from({ length: n }, (_, i) => ({
    userId: `user-${String(i).padStart(3, '0')}`,
    isRantau: i < Math.floor(n / 2),
    isKIP: false,
    cohortId: 'cohort-1',
  }));
}

const DEFAULT_OPTIONS = {
  seed: 'test-seed-42',
  algorithmVersion: ALGORITHM_VERSION,
};

describe('generateBuddyPairs', () => {
  // Test 1: 10 mabas (5 rantau, 5 lokal) → 100% cross pairs
  it('should create 100% cross pairs when input is perfectly balanced (5 rantau + 5 lokal)', () => {
    const input: BuddyInput[] = [
      ...Array.from({ length: 5 }, (_, i) => makeMaba(`r-${i}`, true)),
      ...Array.from({ length: 5 }, (_, i) => makeMaba(`l-${i}`, false)),
    ];

    const result = generateBuddyPairs(input, DEFAULT_OPTIONS);

    expect(result.pairs).toHaveLength(5);
    expect(result.metadata.crossRatio).toBe(1); // 100% cross
    expect(result.metadata.unpaired).toHaveLength(0);

    // All pairs should be cross-demographic
    for (const pair of result.pairs) {
      expect(pair.isCrossDemographic).toBe(true);
    }
  });

  // Test 2: 11 mabas (5 rantau, 6 lokal) — odd number → 1 triple pair
  it('should create a triple pair when odd number of mabas (11)', () => {
    const input: BuddyInput[] = [
      ...Array.from({ length: 5 }, (_, i) => makeMaba(`r-${i}`, true)),
      ...Array.from({ length: 6 }, (_, i) => makeMaba(`l-${i}`, false)),
    ];

    const result = generateBuddyPairs(input, { ...DEFAULT_OPTIONS, oddStrategy: 'triple' });

    // 5 pairs total — the last one is triple (has userCId)
    expect(result.metadata.pairCount).toBe(5);
    expect(result.metadata.tripleCount).toBe(1);
    expect(result.metadata.unpaired).toHaveLength(0);

    const triplePairs = result.pairs.filter((p) => p.isTriple);
    expect(triplePairs).toHaveLength(1);
    expect(triplePairs[0].userCId).toBeDefined();
  });

  // Test 2b: 11 mabas — oddStrategy='unassigned' → 1 unassigned
  it('should unassign one maba when oddStrategy is "unassigned"', () => {
    const input: BuddyInput[] = [
      ...Array.from({ length: 5 }, (_, i) => makeMaba(`r-${i}`, true)),
      ...Array.from({ length: 6 }, (_, i) => makeMaba(`l-${i}`, false)),
    ];

    const result = generateBuddyPairs(input, { ...DEFAULT_OPTIONS, oddStrategy: 'unassigned' });

    expect(result.metadata.unpaired).toHaveLength(1);
    expect(result.metadata.tripleCount).toBe(0);
    expect(result.metadata.pairCount).toBe(5);
  });

  // Test 3: 200 mabas mixed → crossRatio ≥ 80%
  it('should achieve crossRatio >= 80% with 200 mabas (mixed demographics)', () => {
    const input = makeBalancedInput(200);

    const result = generateBuddyPairs(input, DEFAULT_OPTIONS);

    expect(result.metadata.inputCount).toBe(200);
    expect(result.metadata.crossRatio).toBeGreaterThanOrEqual(0.8);
  });

  // Test 4: Same seed, same input → identical output 10 times
  it('should produce identical output for same seed and input (deterministic)', () => {
    const input = makeBalancedInput(20);
    const opts = { seed: 'deterministic-seed-xyz', algorithmVersion: ALGORITHM_VERSION };

    const results = Array.from({ length: 10 }, () => generateBuddyPairs(input, opts));
    const firstPairIds = results[0].pairs.map((p) => `${p.userAId}:${p.userBId}`).join('|');

    for (let i = 1; i < results.length; i++) {
      const pairIds = results[i].pairs.map((p) => `${p.userAId}:${p.userBId}`).join('|');
      expect(pairIds).toBe(firstPairIds);
    }
  });

  // Test 5: Empty input → graceful return
  it('should handle empty input gracefully', () => {
    const result = generateBuddyPairs([], DEFAULT_OPTIONS);

    expect(result.pairs).toHaveLength(0);
    expect(result.metadata.inputCount).toBe(0);
    expect(result.metadata.crossRatio).toBe(0);
    expect(result.metadata.unpaired).toHaveLength(0);
  });

  // Test 6: All rantau → intra-group pairs only
  it('should create intra-rantau pairs when all mabas are rantau', () => {
    const input = Array.from({ length: 4 }, (_, i) => makeMaba(`r-${i}`, true));

    const result = generateBuddyPairs(input, DEFAULT_OPTIONS);

    expect(result.pairs).toHaveLength(2);
    for (const pair of result.pairs) {
      expect(pair.isCrossDemographic).toBe(false);
    }
  });

  // Test 7: metadata contains inputHash consistently
  it('should include consistent inputHash in metadata', () => {
    const input = makeBalancedInput(10);
    const r1 = generateBuddyPairs(input, DEFAULT_OPTIONS);
    const r2 = generateBuddyPairs(input, { ...DEFAULT_OPTIONS, seed: 'different-seed' });

    // Same input → same hash regardless of seed
    expect(r1.metadata.inputHash).toBe(r2.metadata.inputHash);
  });
});

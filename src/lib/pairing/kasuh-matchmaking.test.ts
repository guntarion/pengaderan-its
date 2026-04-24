/**
 * src/lib/pairing/kasuh-matchmaking.test.ts
 * Unit tests for Kasuh matchmaking algorithm.
 */

import { describe, it, expect } from 'vitest';
import { suggestKasuhForMaba, computeJaccard } from './kasuh-matchmaking';
import type { MabaInput, KasuhInput } from './types';

function makeMaba(userId: string, interests: string[], province?: string, prodi?: string): MabaInput {
  return { userId, interests, province: province ?? null, prodi: prodi ?? null, cohortId: 'c1' };
}

function makeKasuh(
  userId: string,
  interests: string[],
  currentCount = 0,
  province?: string,
  prodi?: string,
  status: 'ACTIVE' | 'DEACTIVATED' = 'ACTIVE'
): KasuhInput {
  return { userId, interests, province: province ?? null, prodi: prodi ?? null, currentAssignmentCount: currentCount, status };
}

describe('computeJaccard', () => {
  it('should return correct Jaccard score for overlapping sets', () => {
    const score = computeJaccard(['gaming', 'fotografi', 'coding'], ['gaming', 'musik', 'coding']);
    // Intersect: {gaming, coding} = 2
    // Union: {gaming, fotografi, coding, musik} = 4
    expect(score).toBeCloseTo(2 / 4);
  });

  it('should return 0 for disjoint sets', () => {
    expect(computeJaccard(['gaming'], ['musik'])).toBe(0);
  });

  it('should return 1 for identical sets', () => {
    expect(computeJaccard(['gaming', 'coding'], ['gaming', 'coding'])).toBe(1);
  });

  it('should return 0 for empty sets', () => {
    expect(computeJaccard([], [])).toBe(0);
  });

  it('should return 0 when one set is empty', () => {
    expect(computeJaccard(['gaming'], [])).toBe(0);
  });
});

describe('suggestKasuhForMaba', () => {
  // Test 1: Top-3 ordered correctly
  it('should return top-3 kasuh ordered by score descending', () => {
    const maba = makeMaba('maba-1', ['gaming', 'coding', 'fotografi'], 'JI', 'D3-Informatika');
    const kasuhs: KasuhInput[] = [
      makeKasuh('k-1', ['musik', 'olahraga'], 0, 'DKI'),  // low score
      makeKasuh('k-2', ['gaming', 'coding'], 0, 'JI'),     // high (jaccard + province)
      makeKasuh('k-3', ['gaming'], 0),                     // medium
      makeKasuh('k-4', ['gaming', 'coding', 'fotografi'], 0), // highest jaccard
    ];

    const results = suggestKasuhForMaba([maba], kasuhs);

    expect(results).toHaveLength(1);
    const suggestions = results[0].topSuggestions;
    expect(suggestions.length).toBeGreaterThan(0);

    // First suggestion should be highest score
    for (let i = 0; i < suggestions.length - 1; i++) {
      expect(suggestions[i].score).toBeGreaterThanOrEqual(suggestions[i + 1].score);
    }

    // Top should be k-4 (full jaccard) or k-2 (jaccard + province bonus)
    // k-4: J(3/3)=1.0, k-2: J(2/4)=0.5 + 0.2 province = 0.7
    expect(suggestions[0].kasuhUserId).toBe('k-4');
  });

  // Test 2: Exclude kasuh at capacity (count >= 2)
  it('should exclude kasuh with currentAssignmentCount >= 2', () => {
    const maba = makeMaba('maba-1', ['gaming']);
    const kasuhs: KasuhInput[] = [
      makeKasuh('k-full', ['gaming'], 2),  // at capacity — excluded
      makeKasuh('k-open', ['gaming'], 1),  // 1 spot left — included
    ];

    const results = suggestKasuhForMaba([maba], kasuhs);
    const kasuhIds = results[0].topSuggestions.map((s) => s.kasuhUserId);

    expect(kasuhIds).not.toContain('k-full');
    expect(kasuhIds).toContain('k-open');
  });

  // Test 3: Exclude DEACTIVATED kasuh
  it('should exclude DEACTIVATED kasuh', () => {
    const maba = makeMaba('maba-1', ['gaming']);
    const kasuhs: KasuhInput[] = [
      makeKasuh('k-active', ['gaming'], 0, undefined, undefined, 'ACTIVE'),
      makeKasuh('k-inactive', ['gaming'], 0, undefined, undefined, 'DEACTIVATED'),
    ];

    const results = suggestKasuhForMaba([maba], kasuhs);
    const kasuhIds = results[0].topSuggestions.map((s) => s.kasuhUserId);

    expect(kasuhIds).not.toContain('k-inactive');
    expect(kasuhIds).toContain('k-active');
  });

  // Test 4: Empty interests → score 0, lowMatch flag
  it('should flag lowMatch when both have empty interests', () => {
    const maba = makeMaba('maba-1', []);
    const kasuhs: KasuhInput[] = [makeKasuh('k-1', [])];

    const results = suggestKasuhForMaba([maba], kasuhs);

    expect(results[0].topSuggestions[0].lowMatch).toBe(true);
    expect(results[0].topSuggestions[0].score).toBe(0);
  });

  // Test 5: Province + prodi bonus applied correctly
  it('should apply +0.2 province bonus and +0.1 prodi bonus', () => {
    const maba = makeMaba('maba-1', [], 'JI', 'D3-Informatika');
    const kasuhs: KasuhInput[] = [
      makeKasuh('k-same-province', [], 0, 'JI'),                // +0.2
      makeKasuh('k-same-prodi', [], 0, undefined, 'D3-Informatika'), // +0.1
      makeKasuh('k-both', [], 0, 'JI', 'D3-Informatika'),       // +0.3
      makeKasuh('k-none', [], 0, 'DKI', 'D3-Fisika'),           // +0
    ];

    // Get all 4 results (topK=4 to test k-none)
    const results = suggestKasuhForMaba([maba], kasuhs, { topK: 4 });
    const top4 = results[0].topSuggestions;

    const kBoth = top4.find((s) => s.kasuhUserId === 'k-both');
    const kProvince = top4.find((s) => s.kasuhUserId === 'k-same-province');
    const kProdi = top4.find((s) => s.kasuhUserId === 'k-same-prodi');
    const kNone = top4.find((s) => s.kasuhUserId === 'k-none');

    expect(kBoth?.score).toBeCloseTo(0.3);
    expect(kProvince?.score).toBeCloseTo(0.2);
    expect(kProdi?.score).toBeCloseTo(0.1);
    expect(kNone?.score).toBeCloseTo(0);
  });

  // Test 6: No eligible kasuh → empty suggestions
  it('should return empty suggestions when no eligible kasuh', () => {
    const maba = makeMaba('maba-1', ['gaming']);
    const kasuhs: KasuhInput[] = [
      makeKasuh('k-full', ['gaming'], 2),          // at capacity
      makeKasuh('k-deact', ['gaming'], 0, undefined, undefined, 'DEACTIVATED'),
    ];

    const results = suggestKasuhForMaba([maba], kasuhs);

    expect(results[0].topSuggestions).toHaveLength(0);
  });

  // Test 7: Returns at most topK results
  it('should return at most topK suggestions', () => {
    const maba = makeMaba('maba-1', ['gaming']);
    const kasuhs = Array.from({ length: 10 }, (_, i) =>
      makeKasuh(`k-${i}`, ['gaming'], 0)
    );

    const results = suggestKasuhForMaba([maba], kasuhs, { topK: 3 });

    expect(results[0].topSuggestions.length).toBeLessThanOrEqual(3);
  });
});

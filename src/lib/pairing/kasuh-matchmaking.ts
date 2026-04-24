/**
 * src/lib/pairing/kasuh-matchmaking.ts
 * Kasuh Matchmaking algorithm: Jaccard similarity + province/prodi bonus, Top-K suggestion.
 *
 * Algorithm per maba:
 * 1. Filter kasuh: only ACTIVE + currentAssignmentCount < 2.
 * 2. Compute Jaccard similarity on interest sets.
 * 3. Add bonus: +0.2 if province matches, +0.1 if prodi matches.
 * 4. Sort descending, return Top-K (default: 3).
 * 5. Flag lowMatch if top score < 0.1 threshold.
 * 6. Build human-readable reasons array.
 *
 * Edge cases:
 * - Empty interests on both sides → score 0 (union is empty → J = 0/0 → 0).
 * - No eligible kasuh → empty topSuggestions.
 */

import { createLogger } from '@/lib/logger';
import type {
  MabaInput,
  KasuhInput,
  KasuhMatchResult,
  KasuhMatchSuggestion,
  KasuhMatchOptions,
  ScoreBreakdown,
} from './types';

const log = createLogger('kasuh-matchmaking');

const DEFAULT_TOP_K = 3;
const DEFAULT_LOW_MATCH_THRESHOLD = 0.1;

// ============================================================
// Jaccard Similarity
// ============================================================

export function computeJaccard(setA: string[], setB: string[]): number {
  if (setA.length === 0 && setB.length === 0) return 0;

  const a = new Set(setA.map((s) => s.toLowerCase().trim()));
  const b = new Set(setB.map((s) => s.toLowerCase().trim()));

  if (a.size === 0 && b.size === 0) return 0;

  let intersectCount = 0;
  for (const item of a) {
    if (b.has(item)) intersectCount++;
  }

  const unionCount = a.size + b.size - intersectCount;
  if (unionCount === 0) return 0;

  return intersectCount / unionCount;
}

// ============================================================
// Build reasons array from score components
// ============================================================

function buildReasons(
  maba: MabaInput,
  kasuh: KasuhInput,
  breakdown: ScoreBreakdown
): string[] {
  const reasons: string[] = [];

  // Shared interests
  const mabaInterests = new Set(maba.interests.map((s) => s.toLowerCase().trim()));
  const sharedInterests = kasuh.interests
    .map((s) => s.toLowerCase().trim())
    .filter((s) => mabaInterests.has(s));

  if (sharedInterests.length > 0) {
    reasons.push(`hobi sama: ${sharedInterests.slice(0, 3).join(', ')}`);
  }

  if (breakdown.provinceBonus > 0 && maba.province) {
    reasons.push(`provinsi sama: ${maba.province}`);
  }

  if (breakdown.prodiBonus > 0 && maba.prodi) {
    reasons.push(`prodi sama: ${maba.prodi}`);
  }

  if (reasons.length === 0) {
    reasons.push('tidak ada kesamaan spesifik');
  }

  return reasons;
}

// ============================================================
// Main export: suggestKasuhForMaba
// ============================================================

export function suggestKasuhForMaba(
  mabas: MabaInput[],
  kasuhs: KasuhInput[],
  options: KasuhMatchOptions = {}
): KasuhMatchResult[] {
  const topK = options.topK ?? DEFAULT_TOP_K;
  const lowMatchThreshold = options.lowMatchThreshold ?? DEFAULT_LOW_MATCH_THRESHOLD;

  log.info('Starting Kasuh matchmaking', {
    mabaCount: mabas.length,
    kasuhCount: kasuhs.length,
    topK,
    lowMatchThreshold,
  });

  // Filter eligible kasuh: ACTIVE + not at capacity
  const eligibleKasuh = kasuhs.filter(
    (k) => k.status === 'ACTIVE' && k.currentAssignmentCount < 2
  );

  log.debug('Eligible kasuh after filter', {
    eligible: eligibleKasuh.length,
    filtered: kasuhs.length - eligibleKasuh.length,
  });

  const results: KasuhMatchResult[] = [];

  for (const maba of mabas) {
    const scored: Array<{ kasuh: KasuhInput; breakdown: ScoreBreakdown }> = [];

    for (const kasuh of eligibleKasuh) {
      const jaccardScore = computeJaccard(maba.interests, kasuh.interests);
      const provinceBonus = maba.province && kasuh.province && maba.province === kasuh.province ? 0.2 : 0;
      const prodiBonus = maba.prodi && kasuh.prodi && maba.prodi === kasuh.prodi ? 0.1 : 0;
      const totalScore = jaccardScore + provinceBonus + prodiBonus;

      scored.push({
        kasuh,
        breakdown: { jaccardScore, provinceBonus, prodiBonus, totalScore },
      });
    }

    // Sort descending by totalScore
    scored.sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);

    // Take top-K
    const topK_results = scored.slice(0, topK);
    const topSuggestions: KasuhMatchSuggestion[] = topK_results.map(({ kasuh, breakdown }) => ({
      kasuhUserId: kasuh.userId,
      score: breakdown.totalScore,
      scoreBreakdown: breakdown,
      reasons: buildReasons(maba, kasuh, breakdown),
      lowMatch: breakdown.totalScore < lowMatchThreshold,
    }));

    results.push({
      mabaUserId: maba.userId,
      topSuggestions,
    });
  }

  const lowMatchCount = results.filter(
    (r) => r.topSuggestions.length === 0 || (r.topSuggestions[0]?.lowMatch ?? true)
  ).length;

  log.info('Kasuh matchmaking complete', {
    mabaCount: mabas.length,
    lowMatchCount,
  });

  return results;
}

/**
 * src/lib/mh-scoring/phq9.ts
 * NAWASENA M11 — PHQ-9 Depression Screening Scoring.
 *
 * Pure function — no external calls, no DB access.
 * Data NEVER leaves the server.
 *
 * Scoring:
 *   0-4:   Minimal (GREEN)
 *   5-9:   Mild (YELLOW)
 *   10-14: Moderate (YELLOW)
 *   15-19: Moderately Severe (RED)
 *   20-27: Severe (RED)
 *
 * Special override:
 *   Item #9 (index 8) > 0 → always RED + immediateContact = true (regardless of total score)
 *   This implements the clinical standard for suicidality screening.
 *
 * Reference: Kurniawan & Suparman (2015) — PHQ-9 Indonesian Translation
 */

export interface PHQ9Result {
  totalScore: number;
  severity: 'GREEN' | 'YELLOW' | 'RED';
  flagged: boolean;
  immediateContact: boolean;
  interpretationKey: string;
}

/**
 * Score PHQ-9 answers and return severity classification.
 *
 * @param answers - Array of 9 integers, each 0-3.
 * @returns PHQ9Result with severity, flags, and interpretation key.
 * @throws If answers array length is not 9 or values are not integers 0-3.
 */
export function scorePHQ9(answers: number[]): PHQ9Result {
  if (answers.length !== 9) {
    throw new Error(`PHQ-9 requires exactly 9 answers, got ${answers.length}`);
  }

  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (!Number.isInteger(a) || a < 0 || a > 3) {
      throw new Error(`PHQ-9 answer at index ${i} must be an integer 0-3, got ${a}`);
    }
  }

  const totalScore = answers.reduce((sum, a) => sum + a, 0);
  const itemNine = answers[8] ?? 0;

  // Item #9 override: suicidality/self-harm thought → always RED + immediateContact
  const immediateContact = itemNine > 0;

  const severity: 'GREEN' | 'YELLOW' | 'RED' =
    immediateContact || totalScore >= 15 ? 'RED' :
    totalScore >= 5 ? 'YELLOW' :
    'GREEN';

  const interpretationKey: string =
    totalScore >= 20 ? 'phq9.severe' :
    totalScore >= 15 ? 'phq9.moderately_severe' :
    totalScore >= 10 ? 'phq9.moderate' :
    totalScore >= 5 ? 'phq9.mild' :
    'phq9.minimal';

  // flagged: true when immediateContact OR high borderline (YELLOW borderline 10-14)
  // For V1: flagged = immediateContact (simple rule)
  const flagged = immediateContact;

  return {
    totalScore,
    severity,
    flagged,
    immediateContact,
    interpretationKey,
  };
}

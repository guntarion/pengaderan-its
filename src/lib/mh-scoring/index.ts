/**
 * src/lib/mh-scoring/index.ts
 * NAWASENA M11 — Scoring registry dispatcher.
 *
 * Dispatches to the correct scoring function based on instrument.
 * V2 will add GAD-7, V3 DASS-21.
 */

import { scorePHQ9 } from './phq9';

export type { PHQ9Result } from './phq9';

export type SupportedInstrument = 'PHQ9' | 'GAD7' | 'DASS21';

export interface ScoringResult {
  totalScore: number;
  severity: 'GREEN' | 'YELLOW' | 'RED';
  flagged: boolean;
  immediateContact: boolean;
  interpretationKey: string;
}

/**
 * Score an instrument submission.
 *
 * @param instrument - The instrument to score ('PHQ9', 'GAD7', 'DASS21')
 * @param answers - Array of integer answers (length and range depend on instrument)
 * @returns ScoringResult with severity classification
 * @throws If instrument is not yet implemented or answers are invalid
 */
export function scoreInstrument(
  instrument: SupportedInstrument,
  answers: number[],
): ScoringResult {
  switch (instrument) {
    case 'PHQ9':
      return scorePHQ9(answers);
    case 'GAD7':
      throw new Error('GAD-7 scoring not yet implemented (V2)');
    case 'DASS21':
      throw new Error('DASS-21 scoring not yet implemented (V3)');
    default: {
      const exhaustive: never = instrument;
      throw new Error(`Unknown instrument: ${exhaustive}`);
    }
  }
}

export { scorePHQ9 };

/**
 * src/lib/pulse/__tests__/red-flag-engine.test.ts
 * Unit tests for the pure evaluateRedFlagCondition function.
 */

import { describe, it, expect } from 'vitest';
import { evaluateRedFlagCondition } from '../red-flag-engine';

describe('evaluateRedFlagCondition', () => {
  it('triggers when last 3 moods are all ≤ 2 (moods [1,2,2] avg 1.67)', () => {
    expect(evaluateRedFlagCondition([1, 2, 2])).toBe(true);
  });

  it('does not trigger when mood average is above threshold (moods [3,3,3])', () => {
    expect(evaluateRedFlagCondition([3, 3, 3])).toBe(false);
  });

  it('does not trigger with fewer than 3 pulses', () => {
    expect(evaluateRedFlagCondition([1, 2])).toBe(false);
  });

  it('does not trigger with empty pulses', () => {
    expect(evaluateRedFlagCondition([])).toBe(false);
  });

  it('triggers when first 3 moods are all ≤ 2 even with later higher moods', () => {
    // evaluateRedFlagCondition checks the first 3 (slice 0, MIN_PULSES)
    // Pulses are ordered most recent first: [1,1,2, 4, 5]
    expect(evaluateRedFlagCondition([1, 1, 2, 4, 5])).toBe(true);
  });

  it('does not trigger when one mood is above threshold', () => {
    expect(evaluateRedFlagCondition([1, 3, 2])).toBe(false);
  });

  it('triggers at boundary: mood exactly 2 counts as ≤ threshold', () => {
    expect(evaluateRedFlagCondition([2, 2, 2])).toBe(true);
  });

  it('does not trigger at mood 3 boundary', () => {
    expect(evaluateRedFlagCondition([2, 2, 3])).toBe(false);
  });
});

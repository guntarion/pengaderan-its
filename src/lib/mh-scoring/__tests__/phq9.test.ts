/**
 * src/lib/mh-scoring/__tests__/phq9.test.ts
 * NAWASENA M11 — PHQ-9 scoring boundary case tests.
 *
 * Target: 100% branch coverage.
 */

import { describe, it, expect } from 'vitest';
import { scorePHQ9 } from '../phq9';

// Helper: create answer array with all zeros except specified index
// Note: This helper is defined but not used in the test suite.
// It's kept for potential future test scenarios.

describe('scorePHQ9 — severity classification', () => {
  it('score 0 → GREEN, no immediateContact', () => {
    const result = scorePHQ9([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(result.totalScore).toBe(0);
    expect(result.severity).toBe('GREEN');
    expect(result.immediateContact).toBe(false);
    expect(result.flagged).toBe(false);
    expect(result.interpretationKey).toBe('phq9.minimal');
  });

  it('score 4 → GREEN', () => {
    const result = scorePHQ9([1, 1, 1, 1, 0, 0, 0, 0, 0]);
    expect(result.totalScore).toBe(4);
    expect(result.severity).toBe('GREEN');
    expect(result.interpretationKey).toBe('phq9.minimal');
  });

  it('score 5 → YELLOW (mild)', () => {
    const result = scorePHQ9([1, 1, 1, 1, 1, 0, 0, 0, 0]);
    expect(result.totalScore).toBe(5);
    expect(result.severity).toBe('YELLOW');
    expect(result.interpretationKey).toBe('phq9.mild');
  });

  it('score 9 → YELLOW (mild)', () => {
    const result = scorePHQ9([2, 2, 2, 2, 1, 0, 0, 0, 0]);
    expect(result.totalScore).toBe(9);
    expect(result.severity).toBe('YELLOW');
    expect(result.interpretationKey).toBe('phq9.mild');
  });

  it('score 10 → YELLOW (moderate)', () => {
    const result = scorePHQ9([2, 2, 2, 2, 2, 0, 0, 0, 0]);
    expect(result.totalScore).toBe(10);
    expect(result.severity).toBe('YELLOW');
    expect(result.interpretationKey).toBe('phq9.moderate');
  });

  it('score 14 → YELLOW (moderate)', () => {
    const result = scorePHQ9([3, 3, 2, 2, 2, 2, 0, 0, 0]);
    expect(result.totalScore).toBe(14);
    expect(result.severity).toBe('YELLOW');
    expect(result.interpretationKey).toBe('phq9.moderate');
  });

  it('score 15 → RED (moderately severe)', () => {
    const result = scorePHQ9([3, 3, 3, 3, 3, 0, 0, 0, 0]);
    expect(result.totalScore).toBe(15);
    expect(result.severity).toBe('RED');
    expect(result.immediateContact).toBe(false);
    expect(result.interpretationKey).toBe('phq9.moderately_severe');
  });

  it('score 19 → RED (moderately severe)', () => {
    const result = scorePHQ9([3, 3, 3, 3, 3, 2, 2, 0, 0]);
    expect(result.totalScore).toBe(19);
    expect(result.severity).toBe('RED');
    expect(result.interpretationKey).toBe('phq9.moderately_severe');
  });

  it('score 20 → RED (severe)', () => {
    const result = scorePHQ9([3, 3, 3, 3, 3, 3, 2, 0, 0]);
    expect(result.totalScore).toBe(20);
    expect(result.severity).toBe('RED');
    expect(result.interpretationKey).toBe('phq9.severe');
  });

  it('score 27 (max) → RED (severe)', () => {
    const result = scorePHQ9([3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(result.totalScore).toBe(27);
    expect(result.severity).toBe('RED');
    expect(result.immediateContact).toBe(true);
    expect(result.interpretationKey).toBe('phq9.severe');
  });
});

describe('scorePHQ9 — item #9 override (suicidality)', () => {
  it('item #9 = 1, rest = 0 → RED + immediateContact=true (total=1 would normally be GREEN)', () => {
    const result = scorePHQ9([0, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(result.totalScore).toBe(1);
    expect(result.severity).toBe('RED');
    expect(result.immediateContact).toBe(true);
    expect(result.flagged).toBe(true);
    expect(result.interpretationKey).toBe('phq9.minimal');
  });

  it('item #9 = 2, rest = 0 → RED + immediateContact=true', () => {
    const result = scorePHQ9([0, 0, 0, 0, 0, 0, 0, 0, 2]);
    expect(result.severity).toBe('RED');
    expect(result.immediateContact).toBe(true);
  });

  it('item #9 = 3, rest = 0 → RED + immediateContact=true', () => {
    const result = scorePHQ9([0, 0, 0, 0, 0, 0, 0, 0, 3]);
    expect(result.severity).toBe('RED');
    expect(result.immediateContact).toBe(true);
  });

  it('item #9 = 0, total = 15 → RED but immediateContact=false', () => {
    const result = scorePHQ9([3, 3, 3, 3, 3, 0, 0, 0, 0]);
    expect(result.totalScore).toBe(15);
    expect(result.severity).toBe('RED');
    expect(result.immediateContact).toBe(false);
    expect(result.flagged).toBe(false);
  });

  it('item #9 = 0, total = 4 → GREEN, no immediateContact', () => {
    const result = scorePHQ9([1, 1, 1, 1, 0, 0, 0, 0, 0]);
    expect(result.severity).toBe('GREEN');
    expect(result.immediateContact).toBe(false);
  });
});

describe('scorePHQ9 — input validation', () => {
  it('throws when array has fewer than 9 items', () => {
    expect(() => scorePHQ9([1, 2, 3, 1, 0, 0, 0, 0])).toThrow('PHQ-9 requires exactly 9 answers');
  });

  it('throws when array has more than 9 items', () => {
    expect(() => scorePHQ9([1, 1, 1, 1, 1, 1, 1, 1, 1, 1])).toThrow('PHQ-9 requires exactly 9 answers');
  });

  it('throws for empty array', () => {
    expect(() => scorePHQ9([])).toThrow('PHQ-9 requires exactly 9 answers');
  });

  it('throws for answer value 4 (out of range)', () => {
    expect(() => scorePHQ9([4, 0, 0, 0, 0, 0, 0, 0, 0])).toThrow('must be an integer 0-3');
  });

  it('throws for negative answer value', () => {
    expect(() => scorePHQ9([-1, 0, 0, 0, 0, 0, 0, 0, 0])).toThrow('must be an integer 0-3');
  });

  it('throws for non-integer float', () => {
    expect(() => scorePHQ9([1.5, 0, 0, 0, 0, 0, 0, 0, 0])).toThrow('must be an integer 0-3');
  });

  it('accepts all zeros (valid minimum)', () => {
    expect(() => scorePHQ9([0, 0, 0, 0, 0, 0, 0, 0, 0])).not.toThrow();
  });

  it('accepts all threes (valid maximum)', () => {
    expect(() => scorePHQ9([3, 3, 3, 3, 3, 3, 3, 3, 3])).not.toThrow();
  });
});

describe('scorePHQ9 — return shape', () => {
  it('returns all required fields', () => {
    const result = scorePHQ9([1, 1, 1, 0, 0, 0, 0, 0, 0]);
    expect(result).toHaveProperty('totalScore');
    expect(result).toHaveProperty('severity');
    expect(result).toHaveProperty('flagged');
    expect(result).toHaveProperty('immediateContact');
    expect(result).toHaveProperty('interpretationKey');
  });
});

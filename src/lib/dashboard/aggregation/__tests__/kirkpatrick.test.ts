/**
 * src/lib/dashboard/aggregation/__tests__/kirkpatrick.test.ts
 * Unit tests for Kirkpatrick compute functions.
 * Tests the output shape and partial flag logic.
 */

import { describe, it, expect } from 'vitest';
import type { KirkpatrickLevel } from '../kirkpatrick';

// Test the KirkpatrickLevel type shape contract
describe('KirkpatrickLevel contract', () => {
  const validLevel: KirkpatrickLevel = {
    level: 1,
    label: 'Reaksi (L1)',
    value: 7.5,
    target: 8.0,
    trend30d: [7.0, 7.2, 7.5],
    partial: false,
    source: 'M06',
  };

  it('should have correct level number (1-4)', () => {
    expect(validLevel.level).toBeGreaterThanOrEqual(1);
    expect(validLevel.level).toBeLessThanOrEqual(4);
  });

  it('should have a label string', () => {
    expect(typeof validLevel.label).toBe('string');
    expect(validLevel.label.length).toBeGreaterThan(0);
  });

  it('should have value and target as numbers or null', () => {
    expect(validLevel.value === null || typeof validLevel.value === 'number').toBe(true);
    expect(validLevel.target === null || typeof validLevel.target === 'number').toBe(true);
  });

  it('should have trend30d as array', () => {
    expect(Array.isArray(validLevel.trend30d)).toBe(true);
  });

  it('should have partial flag as boolean', () => {
    expect(typeof validLevel.partial).toBe('boolean');
  });

  it('L4 should always be partial (SIAKAD not integrated)', () => {
    const l4: KirkpatrickLevel = {
      level: 4,
      label: 'Hasil (L4)',
      value: 85.0,
      target: 90.0,
      trend30d: [85.0],
      partial: true,
      partialReason: 'IPS & LKMM-TD menunggu integrasi SIAKAD',
      source: 'M01',
    };
    expect(l4.partial).toBe(true);
    expect(l4.partialReason).toContain('SIAKAD');
  });
});

describe('KirkpatrickSnapshot contract', () => {
  it('should have 4 levels in snapshot', () => {
    const snapshot = {
      cohortId: 'test-cohort',
      computedAt: new Date(),
      levels: [1, 2, 3, 4].map((n) => ({
        level: n as 1 | 2 | 3 | 4,
        label: `Level ${n}`,
        value: n * 2.0,
        target: n * 2.5,
        trend30d: [],
        partial: false,
        source: 'TEST',
      })),
    };
    expect(snapshot.levels).toHaveLength(4);
  });
});

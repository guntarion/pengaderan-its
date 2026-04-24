/**
 * src/lib/dashboard/aggregation/__tests__/aggregation-helpers.test.ts
 * Unit tests for aggregation helper functions.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  aggregateWithCellFloor,
  safePercent,
  calcTrend,
  daysAgo,
  round2,
} from '../aggregation-helpers';

describe('aggregateWithCellFloor', () => {
  it('should return data when count >= minCell (default 5)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ count: 10, data: { avg: 3.5 } });
    const result = await aggregateWithCellFloor(queryFn);
    expect(result).toEqual({ avg: 3.5 });
    expect(queryFn).toHaveBeenCalledOnce();
  });

  it('should return null when count < minCell (default 5)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ count: 4, data: { avg: 2.0 } });
    const result = await aggregateWithCellFloor(queryFn);
    expect(result).toBeNull();
  });

  it('should respect custom minCell value', async () => {
    const queryFn = vi.fn().mockResolvedValue({ count: 8, data: { value: 42 } });
    const result = await aggregateWithCellFloor(queryFn, 10);
    expect(result).toBeNull();
  });

  it('should return data when count exactly equals minCell', async () => {
    const queryFn = vi.fn().mockResolvedValue({ count: 5, data: { value: 99 } });
    const result = await aggregateWithCellFloor(queryFn, 5);
    expect(result).toEqual({ value: 99 });
  });

  it('should throw if queryFn throws', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('DB error'));
    await expect(aggregateWithCellFloor(queryFn)).rejects.toThrow('DB error');
  });

  it('should enforce cell floor for MH privacy (count = 3)', async () => {
    // Simulates a small cohort with only 3 MH screening entries
    const mhQuery = vi.fn().mockResolvedValue({ count: 3, data: { phq9Avg: 7.2 } });
    const result = await aggregateWithCellFloor(mhQuery);
    expect(result).toBeNull(); // Privacy enforced
  });
});

describe('safePercent', () => {
  it('should calculate percentage correctly', () => {
    expect(safePercent(80, 100)).toBe(80);
    expect(safePercent(1, 3)).toBe(33.3);
    expect(safePercent(0, 100)).toBe(0);
  });

  it('should return null for zero denominator', () => {
    expect(safePercent(5, 0)).toBeNull();
  });
});

describe('calcTrend', () => {
  it('should return up for increasing values', () => {
    expect(calcTrend([1, 2, 3, 4, 5])).toBe('up');
  });

  it('should return down for decreasing values', () => {
    expect(calcTrend([5, 4, 3, 2, 1])).toBe('down');
  });

  it('should return stable for very small difference', () => {
    expect(calcTrend([3.0, 3.02])).toBe('stable');
  });

  it('should return stable for single value', () => {
    expect(calcTrend([4.5])).toBe('stable');
  });

  it('should return stable for empty array', () => {
    expect(calcTrend([])).toBe('stable');
  });
});

describe('daysAgo', () => {
  it('should return a date N days in the past at midnight', () => {
    const d = daysAgo(7);
    const now = new Date();
    // daysAgo(7) sets to midnight, now may be any time of day
    // so the diff in days is between 6 and 8
    const diffMs = now.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(8);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe('round2', () => {
  it('should round to 2 decimal places', () => {
    expect(round2(3.14159)).toBe(3.14);
    expect(round2(2.005)).toBe(2.01);
  });

  it('should return null for null/undefined', () => {
    expect(round2(null)).toBeNull();
    expect(round2(undefined)).toBeNull();
  });
});

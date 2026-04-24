/**
 * src/lib/dashboard/aggregation/__tests__/kpi-compute.test.ts
 * Unit tests for KPI compute registry and iterator.
 */

import { describe, it, expect } from 'vitest';
import { MEASURE_METHOD_REGISTRY } from '../kpi-compute';

describe('MEASURE_METHOD_REGISTRY', () => {
  it('should have at least 5 registered compute handlers', () => {
    const keys = Object.keys(MEASURE_METHOD_REGISTRY);
    expect(keys.length).toBeGreaterThanOrEqual(5);
  });

  it('should contain core measure methods', () => {
    expect(MEASURE_METHOD_REGISTRY['PULSE_AVG_7D']).toBeDefined();
    expect(MEASURE_METHOD_REGISTRY['NPS_AVG_30D']).toBeDefined();
    expect(MEASURE_METHOD_REGISTRY['ATTENDANCE_RATE_30D']).toBeDefined();
    expect(MEASURE_METHOD_REGISTRY['RUBRIK_AVG_MONTHLY']).toBeDefined();
    expect(MEASURE_METHOD_REGISTRY['JOURNAL_SUBMISSION_RATE_7D']).toBeDefined();
    expect(MEASURE_METHOD_REGISTRY['PASSPORT_COMPLETION_RATE']).toBeDefined();
    expect(MEASURE_METHOD_REGISTRY['PAKTA_SIGNED_RATE']).toBeDefined();
  });

  it('should have all handlers be async functions', () => {
    for (const [key, fn] of Object.entries(MEASURE_METHOD_REGISTRY)) {
      expect(typeof fn).toBe('function');
      // Verify it returns a promise-like by checking constructor name
      const result = fn('test-cohort');
      expect(result).toBeInstanceOf(Promise);
      // Clean up the promise to avoid unhandled rejection
      result.catch(() => {});
    }
  });
});

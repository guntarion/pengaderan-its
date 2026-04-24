/**
 * src/lib/dashboard/aggregation/__tests__/live-compute.test.ts
 * Unit tests for live compute helper functions (type/shape contracts).
 */

import { describe, it, expect } from 'vitest';
import type { MoodAvgResult, AlertCountResult, UpcomingEvent } from '../live-compute';

describe('MoodAvgResult contract', () => {
  it('should have correct shape', () => {
    const result: MoodAvgResult = {
      avg: 3.8,
      count: 25,
      trend7d: [3.5, 3.6, 3.7, 3.8, 3.9, 3.8, 3.8],
    };
    expect(result.avg).toBeCloseTo(3.8);
    expect(result.count).toBeGreaterThan(0);
    expect(result.trend7d).toHaveLength(7);
  });

  it('should allow null avg (no entries today)', () => {
    const result: MoodAvgResult = {
      avg: null,
      count: 0,
      trend7d: [0, 0, 0, 0, 0, 0, 0],
    };
    expect(result.avg).toBeNull();
    expect(result.count).toBe(0);
  });
});

describe('AlertCountResult contract', () => {
  it('should have breakdown by severity', () => {
    const result: AlertCountResult = {
      total: 10,
      critical: 1,
      high: 2,
      medium: 4,
      low: 3,
    };
    expect(result.total).toBe(10);
    expect(result.critical + result.high + result.medium + result.low).toBe(10);
  });

  it('should allow all zeros (no alerts)', () => {
    const result: AlertCountResult = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    expect(result.total).toBe(0);
  });
});

describe('UpcomingEvent contract', () => {
  it('should have required fields', () => {
    const event: UpcomingEvent = {
      id: 'evt-001',
      title: 'Materi Kepemimpinan',
      startTime: new Date('2026-05-01T09:00:00Z'),
      location: 'Aula FTEI',
      rsvpStatus: 'ACCEPTED',
    };
    expect(event.id).toBeTruthy();
    expect(event.title).toBeTruthy();
    expect(event.startTime).toBeInstanceOf(Date);
  });

  it('should allow optional fields to be undefined', () => {
    const event: UpcomingEvent = {
      id: 'evt-002',
      title: 'Webinar Online',
      startTime: new Date(),
    };
    expect(event.location).toBeUndefined();
    expect(event.rsvpStatus).toBeUndefined();
  });
});

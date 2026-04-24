/**
 * src/lib/redflag-rules/__tests__/rules.test.ts
 * Unit tests for red flag rules (type contracts + logic).
 */

import { describe, it, expect, vi } from 'vitest';
import { RULES } from '../index';
import type { RuleContext, RuleHit } from '../types';
import { RedFlagType, RedFlagSeverity, UserRole } from '@prisma/client';

// Mock prisma client
const mockPrisma = {
  pulseCheck: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
  },
  user: { findMany: vi.fn(), count: vi.fn() },
  journal: { groupBy: vi.fn() },
  kPGroup: { findMany: vi.fn() },
  kPLogWeekly: { groupBy: vi.fn() },
  safeguardIncident: { findMany: vi.fn() },
  anonReport: { findMany: vi.fn() },
  kegiatanInstance: { findMany: vi.fn() },
};

const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

const baseCtx: RuleContext = {
  cohortId: 'cohort-test',
  organizationId: 'org-test',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: mockPrisma as any,
  log: mockLog,
};

describe('RULES registry', () => {
  it('should have 8 registered rules', () => {
    expect(RULES).toHaveLength(8);
  });

  it('should have all required RedFlagTypes represented', () => {
    const types = RULES.map((r) => r.type);
    expect(types).toContain(RedFlagType.PULSE_LOW_3D);
    expect(types).toContain(RedFlagType.JOURNAL_DORMANT_14D);
    expect(types).toContain(RedFlagType.KP_DEBRIEF_OVERDUE_14D);
    expect(types).toContain(RedFlagType.PAKTA_UNSIGNED_7D);
    expect(types).toContain(RedFlagType.INCIDENT_CREATED_UNASSIGNED);
    expect(types).toContain(RedFlagType.ANON_REPORT_RED_NEW);
    expect(types).toContain(RedFlagType.MOOD_COHORT_DROP);
    expect(types).toContain(RedFlagType.NPS_DROP);
  });

  it('should have all rules enabled by default', () => {
    for (const rule of RULES) {
      expect(rule.enabled).toBe(true);
    }
  });

  it('should have all rules with targetRoles', () => {
    for (const rule of RULES) {
      expect(Array.isArray(rule.targetRoles)).toBe(true);
      expect(rule.targetRoles.length).toBeGreaterThan(0);
    }
  });
});

describe('pulse-low-3d rule', () => {
  const rule = RULES.find((r) => r.type === RedFlagType.PULSE_LOW_3D)!;

  it('should return hits when users have low pulse for 3+ days', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    mockPrisma.pulseCheck.findMany.mockResolvedValue([
      { userId: 'user-1', recordedAt: threeDaysAgo, moodScore: 1 },
      { userId: 'user-1', recordedAt: twoDaysAgo, moodScore: 2 },
      { userId: 'user-1', recordedAt: oneDayAgo, moodScore: 1 },
    ]);

    const hits = await rule.evaluate(baseCtx);
    expect(hits.length).toBe(1);
    expect(hits[0].targetUserId).toBe('user-1');
    expect(hits[0].severity).toBe(RedFlagSeverity.HIGH);
  });

  it('should return no hits when pulse is normal', async () => {
    mockPrisma.pulseCheck.findMany.mockResolvedValue([]);
    const hits = await rule.evaluate(baseCtx);
    expect(hits.length).toBe(0);
  });

  it('should not trigger for only 2 low days', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    mockPrisma.pulseCheck.findMany.mockResolvedValue([
      { userId: 'user-2', recordedAt: twoDaysAgo, moodScore: 2 },
      { userId: 'user-2', recordedAt: oneDayAgo, moodScore: 1 },
    ]);

    const hits = await rule.evaluate(baseCtx);
    expect(hits.length).toBe(0);
  });
});

describe('incident-unassigned rule', () => {
  const rule = RULES.find((r) => r.type === RedFlagType.INCIDENT_CREATED_UNASSIGNED)!;

  it('should return CRITICAL hits for unassigned incidents > 24h', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    mockPrisma.safeguardIncident.findMany.mockResolvedValue([
      {
        id: 'inc-1',
        title: 'Test Incident',
        createdAt: oldDate,
        reportedBy: { id: 'user-reporter' },
      },
    ]);

    const hits = await rule.evaluate(baseCtx);
    expect(hits.length).toBe(1);
    expect(hits[0].severity).toBe(RedFlagSeverity.CRITICAL);
    expect(hits[0].targetRoles).toContain(UserRole.SATGAS);
  });

  it('should return no hits when no unassigned incidents', async () => {
    mockPrisma.safeguardIncident.findMany.mockResolvedValue([]);
    const hits = await rule.evaluate(baseCtx);
    expect(hits.length).toBe(0);
  });
});

describe('anon-report-red rule', () => {
  const rule = RULES.find((r) => r.type === RedFlagType.ANON_REPORT_RED_NEW)!;

  it('should return hits for new CRITICAL/HIGH anon reports', async () => {
    mockPrisma.anonReport.findMany.mockResolvedValue([
      { id: 'rpt-1', trackingCode: 'RPT-001', severity: 'CRITICAL', createdAt: new Date() },
    ]);

    const hits = await rule.evaluate(baseCtx);
    expect(hits.length).toBe(1);
    expect(hits[0].severity).toBe(RedFlagSeverity.CRITICAL);
    expect(hits[0].targetRoles).toContain(UserRole.BLM);
    // Privacy: URL should only contain tracking code, not body
    expect(hits[0].targetUrl).toContain('RPT-001');
    expect(hits[0].metadata).toHaveProperty('trackingCode');
  });

  it('should return no hits when no new red reports', async () => {
    mockPrisma.anonReport.findMany.mockResolvedValue([]);
    const hits = await rule.evaluate(baseCtx);
    expect(hits.length).toBe(0);
  });
});

describe('RuleHit type contract', () => {
  it('should have correct required fields', () => {
    const hit: RuleHit = {
      title: 'Test Alert',
      severity: RedFlagSeverity.MEDIUM,
      targetRoles: [UserRole.SC],
      targetUrl: '/dashboard/test',
    };
    expect(hit.title).toBeTruthy();
    expect(hit.severity).toBeTruthy();
    expect(Array.isArray(hit.targetRoles)).toBe(true);
    expect(hit.targetUrl).toBeTruthy();
  });
});

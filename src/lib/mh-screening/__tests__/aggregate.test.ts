/**
 * src/lib/mh-screening/__tests__/aggregate.test.ts
 * NAWASENA M11 — Unit tests for aggregate cell-floor masking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock prisma and rls-helpers
vi.mock('@/utils/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock('../access-log', () => ({
  recordMHAccess: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '@/utils/prisma';

// We need to import aggregateSeverityPerKPGroup AFTER mocking
// Because withMHBypass uses prisma.$transaction
let aggregateSeverityPerKPGroup: typeof import('../aggregate').aggregateSeverityPerKPGroup;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.MH_ENCRYPTION_KEY = 'test-key-at-least-32-chars-long-ok';

  // Re-import to get fresh instance
  const aggregateModule = await import('../aggregate');
  aggregateSeverityPerKPGroup = aggregateModule.aggregateSeverityPerKPGroup;
});

describe('aggregateSeverityPerKPGroup — cell floor masking', () => {
  function setupMockTransaction(rows: { kpGroupId: string | null; severity: string; phase: string; count: bigint }[]) {
    const mockTx = {
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
      $executeRaw: vi.fn().mockResolvedValue(undefined),
      $queryRaw: vi.fn().mockResolvedValue(rows),
    };

    // Mock access-log create (called via recordMHAccess inside bypass)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockTx as Record<string, unknown>).mHAccessLog = {
      create: vi.fn().mockResolvedValue({ id: 'clog1' }),
    };

    (prisma.$transaction as Mock).mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
      return fn(mockTx);
    });

    return mockTx;
  }

  it('masks count=3 (below cell floor 5)', async () => {
    setupMockTransaction([
      { kpGroupId: 'ckpgroup1', severity: 'RED', phase: 'F1', count: BigInt(3) },
    ]);

    const result = await aggregateSeverityPerKPGroup(
      'ccohort123',
      'F1',
      { id: 'cadmin12345678', role: 'SUPERADMIN', organizationId: 'corg123' },
      5,
    );

    expect(result).toHaveLength(1);
    expect(result[0].count).toBeNull();
    expect(result[0].masked).toBe(true);
    expect(result[0].severity).toBe('RED');
  });

  it('does NOT mask count=5 (exactly at cell floor)', async () => {
    setupMockTransaction([
      { kpGroupId: 'ckpgroup1', severity: 'RED', phase: 'F1', count: BigInt(5) },
    ]);

    const result = await aggregateSeverityPerKPGroup(
      'ccohort123',
      'F1',
      { id: 'cadmin12345678', role: 'SUPERADMIN', organizationId: 'corg123' },
      5,
    );

    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(5);
    expect(result[0].masked).toBe(false);
  });

  it('masks count=4 (below cell floor 5)', async () => {
    setupMockTransaction([
      { kpGroupId: 'ckpgroup2', severity: 'YELLOW', phase: 'F1', count: BigInt(4) },
    ]);

    const result = await aggregateSeverityPerKPGroup(
      'ccohort123',
      'F1',
      { id: 'cadmin12345678', role: 'SUPERADMIN', organizationId: 'corg123' },
      5,
    );

    expect(result[0].count).toBeNull();
    expect(result[0].masked).toBe(true);
  });

  it('mixes masked and unmasked rows', async () => {
    setupMockTransaction([
      { kpGroupId: 'ckpgroup1', severity: 'GREEN', phase: 'F1', count: BigInt(10) },
      { kpGroupId: 'ckpgroup1', severity: 'RED', phase: 'F1', count: BigInt(2) },
      { kpGroupId: 'ckpgroup2', severity: 'YELLOW', phase: 'F1', count: BigInt(7) },
    ]);

    const result = await aggregateSeverityPerKPGroup(
      'ccohort123',
      'F1',
      { id: 'cadmin12345678', role: 'SUPERADMIN', organizationId: 'corg123' },
      5,
    );

    expect(result).toHaveLength(3);
    // count=10 → not masked
    const green = result.find((r) => r.severity === 'GREEN' && r.kpGroupId === 'ckpgroup1');
    expect(green?.count).toBe(10);
    expect(green?.masked).toBe(false);
    // count=2 → masked
    const red = result.find((r) => r.severity === 'RED' && r.kpGroupId === 'ckpgroup1');
    expect(red?.count).toBeNull();
    expect(red?.masked).toBe(true);
    // count=7 → not masked
    const yellow = result.find((r) => r.severity === 'YELLOW' && r.kpGroupId === 'ckpgroup2');
    expect(yellow?.count).toBe(7);
    expect(yellow?.masked).toBe(false);
  });
});

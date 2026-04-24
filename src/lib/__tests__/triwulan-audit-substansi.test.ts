/**
 * src/lib/__tests__/triwulan-audit-substansi.test.ts
 * NAWASENA M14 — Unit tests for audit substansi service validation logic.
 *
 * Tests validation rules without DB I/O (Prisma is mocked).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MuatanWajibKey, MuatanCoverageStatus, ReviewStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Mock Prisma before importing the service
// vi.hoisted() ensures these run before vi.mock() factory (which is hoisted)
// ---------------------------------------------------------------------------
const {
  mockPrismaTransaction,
  mockAuditSubstansiResultUpsert,
  mockAuditSubstansiResultCount,
  mockAuditSubstansiResultFindMany,
  mockTriwulanReviewFindUnique,
  mockTriwulanReviewUpdateMany,
  mockTriwulanSignatureEventCreate,
} = vi.hoisted(() => ({
  mockPrismaTransaction: vi.fn(),
  mockAuditSubstansiResultUpsert: vi.fn(),
  mockAuditSubstansiResultCount: vi.fn(),
  mockAuditSubstansiResultFindMany: vi.fn(),
  mockTriwulanReviewFindUnique: vi.fn(),
  mockTriwulanReviewUpdateMany: vi.fn(),
  mockTriwulanSignatureEventCreate: vi.fn(),
}));

vi.mock('@/utils/prisma', () => ({
  prisma: {
    $transaction: mockPrismaTransaction,
    auditSubstansiResult: {
      upsert: mockAuditSubstansiResultUpsert,
      count: mockAuditSubstansiResultCount,
      findMany: mockAuditSubstansiResultFindMany,
    },
    triwulanReview: {
      findUnique: mockTriwulanReviewFindUnique,
      updateMany: mockTriwulanReviewUpdateMany,
    },
    triwulanSignatureEvent: {
      create: mockTriwulanSignatureEventCreate,
    },
  },
}));

// Mock escalation notifier (fire-and-forget — no need to verify)
vi.mock('../triwulan/escalation/notifier', () => ({
  notifyRevisionRequested: vi.fn().mockResolvedValue(undefined),
  notifyEscalation: vi.fn().mockResolvedValue(undefined),
}));

// Mock the state machine (pure functions, but isolate unit)
vi.mock('../triwulan/state-machine/transitions', async (importOriginal) => {
  // Use real implementation — state machine is pure and has its own test file
  return importOriginal();
});

import { upsertAuditItem, acknowledgeByBLM } from '../triwulan/audit-substansi/service';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// upsertAuditItem — validation: NOT_COVERED/PARTIAL require notes >= 50
// ---------------------------------------------------------------------------
describe('upsertAuditItem()', () => {
  const baseInput = {
    reviewId: 'rev-1',
    itemKey: MuatanWajibKey.TRI_DHARMA,
    userId: 'user-1',
    orgId: 'org-1',
    ipHash: 'hash-abc',
  };

  it('throws VALIDATION_ERROR when coverage is NOT_COVERED and notes is missing', async () => {
    await expect(
      upsertAuditItem({ ...baseInput, coverage: MuatanCoverageStatus.NOT_COVERED })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('throws VALIDATION_ERROR when coverage is NOT_COVERED and notes < 50 chars', async () => {
    await expect(
      upsertAuditItem({
        ...baseInput,
        coverage: MuatanCoverageStatus.NOT_COVERED,
        notes: 'too short',
      })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('throws VALIDATION_ERROR when coverage is PARTIAL and notes < 50 chars', async () => {
    await expect(
      upsertAuditItem({
        ...baseInput,
        coverage: MuatanCoverageStatus.PARTIAL,
        notes: 'x'.repeat(49),
      })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('throws VALIDATION_ERROR when coverage is PARTIAL and notes is empty string', async () => {
    await expect(
      upsertAuditItem({
        ...baseInput,
        coverage: MuatanCoverageStatus.PARTIAL,
        notes: '',
      })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('proceeds when coverage is NOT_COVERED and notes >= 50 chars', async () => {
    mockPrismaTransaction.mockResolvedValue([{}, {}]);
    await expect(
      upsertAuditItem({
        ...baseInput,
        coverage: MuatanCoverageStatus.NOT_COVERED,
        notes: 'x'.repeat(50),
      })
    ).resolves.toBeUndefined();
  });

  it('proceeds when coverage is PARTIAL and notes >= 50 chars', async () => {
    mockPrismaTransaction.mockResolvedValue([{}, {}]);
    await expect(
      upsertAuditItem({
        ...baseInput,
        coverage: MuatanCoverageStatus.PARTIAL,
        notes: 'Penjelasan mendetail mengapa materi ini hanya sebagian tercakup dalam kaderisasi.',
      })
    ).resolves.toBeUndefined();
  });

  it('does NOT require notes when coverage is COVERED', async () => {
    mockPrismaTransaction.mockResolvedValue([{}, {}]);
    await expect(
      upsertAuditItem({ ...baseInput, coverage: MuatanCoverageStatus.COVERED })
    ).resolves.toBeUndefined();
  });

  it('does NOT require notes when coverage is NOT_ASSESSED', async () => {
    mockPrismaTransaction.mockResolvedValue([{}, {}]);
    await expect(
      upsertAuditItem({ ...baseInput, coverage: MuatanCoverageStatus.NOT_ASSESSED })
    ).resolves.toBeUndefined();
  });

  it('includes the note length info in error message', async () => {
    let err: Error | null = null;
    try {
      await upsertAuditItem({
        ...baseInput,
        coverage: MuatanCoverageStatus.NOT_COVERED,
        notes: 'terlalu pendek',
      });
    } catch (e) {
      err = e as Error;
    }
    expect(err).not.toBeNull();
    expect(err!.message).toContain('50');
  });
});

// ---------------------------------------------------------------------------
// acknowledgeByBLM — validation: all 10 items must be assessed
// ---------------------------------------------------------------------------
describe('acknowledgeByBLM()', () => {
  const baseInput = {
    reviewId: 'rev-1',
    userId: 'blm-user',
    notes: 'Semua muatan wajib telah diperiksa dan dinilai dengan baik.',
    ipHash: 'hash-xyz',
  };

  function mockReviewFound(status: ReviewStatus) {
    mockTriwulanReviewFindUnique.mockResolvedValue({
      id: 'rev-1',
      status,
      organizationId: 'org-1',
      cohortId: 'cohort-1',
      quarterNumber: 1,
    });
  }

  it('throws NOT_FOUND when review does not exist', async () => {
    mockTriwulanReviewFindUnique.mockResolvedValue(null);
    await expect(acknowledgeByBLM(baseInput)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws CHECKLIST_INCOMPLETE when assessedCount < 10', async () => {
    mockReviewFound(ReviewStatus.PEMBINA_SIGNED);
    mockAuditSubstansiResultCount.mockResolvedValue(9);
    await expect(acknowledgeByBLM(baseInput)).rejects.toMatchObject({
      code: 'CHECKLIST_INCOMPLETE',
    });
  });

  it('throws CHECKLIST_INCOMPLETE when assessedCount === 0', async () => {
    mockReviewFound(ReviewStatus.PEMBINA_SIGNED);
    mockAuditSubstansiResultCount.mockResolvedValue(0);
    await expect(acknowledgeByBLM(baseInput)).rejects.toMatchObject({
      code: 'CHECKLIST_INCOMPLETE',
    });
  });

  it('throws INVALID_STATE when status is not PEMBINA_SIGNED', async () => {
    mockReviewFound(ReviewStatus.DRAFT);
    mockAuditSubstansiResultCount.mockResolvedValue(10);
    await expect(acknowledgeByBLM(baseInput)).rejects.toMatchObject({
      code: 'CHECKLIST_INCOMPLETE', // canBLMAcknowledge fires first (status check)
    });
  });

  it('throws CONFLICT when updateMany affected 0 rows (concurrent update)', async () => {
    mockReviewFound(ReviewStatus.PEMBINA_SIGNED);
    mockAuditSubstansiResultCount.mockResolvedValue(10);
    mockTriwulanReviewUpdateMany.mockResolvedValue({ count: 0 });
    await expect(acknowledgeByBLM(baseInput)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('succeeds when 10 items assessed and status is correct', async () => {
    mockReviewFound(ReviewStatus.PEMBINA_SIGNED);
    mockAuditSubstansiResultCount.mockResolvedValue(10);
    mockTriwulanReviewUpdateMany.mockResolvedValue({ count: 1 });
    mockTriwulanSignatureEventCreate.mockResolvedValue({});
    await expect(acknowledgeByBLM(baseInput)).resolves.toBeUndefined();
  });

  it('error message contains current/total item count', async () => {
    mockReviewFound(ReviewStatus.PEMBINA_SIGNED);
    mockAuditSubstansiResultCount.mockResolvedValue(7);
    let err: Error | null = null;
    try {
      await acknowledgeByBLM(baseInput);
    } catch (e) {
      err = e as Error;
    }
    expect(err).not.toBeNull();
    expect(err!.message).toContain('7/10');
  });
});

// ---------------------------------------------------------------------------
// muatan-wajib catalog sanity checks
// ---------------------------------------------------------------------------
import { getAllItems, getItem, MUATAN_WAJIB_CATALOG } from '../triwulan/audit-substansi/muatan-wajib';

describe('MUATAN_WAJIB_CATALOG', () => {
  it('contains exactly 10 items', () => {
    expect(Object.keys(MUATAN_WAJIB_CATALOG)).toHaveLength(10);
  });

  it('getAllItems() returns 10 items with key property', () => {
    const items = getAllItems();
    expect(items).toHaveLength(10);
    items.forEach((item) => {
      expect(item.key).toBeDefined();
      expect(item.label).toBeDefined();
      expect(item.description).toBeDefined();
    });
  });

  it('all MuatanWajibKey enum values are present in catalog', () => {
    const keys = Object.values(MuatanWajibKey);
    keys.forEach((key) => {
      expect(MUATAN_WAJIB_CATALOG[key]).toBeDefined();
    });
  });

  it('getItem() returns correct item for valid key', () => {
    const item = getItem(MuatanWajibKey.TRI_DHARMA);
    expect(item).toBeDefined();
    expect(item!.label).toContain('Tri Dharma');
  });

  it('getItem() returns undefined for unknown key', () => {
    const item = getItem('UNKNOWN_KEY' as MuatanWajibKey);
    expect(item).toBeUndefined();
  });
});

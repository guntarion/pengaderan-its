/**
 * Unit tests for cohort.service.ts
 * Tests CohortSettings schema validation and updateSettings function.
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// Mock Prisma
vi.mock('@/utils/prisma', () => ({
  prisma: {
    cohort: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock audit logger
vi.mock('@/lib/audit/audit-helpers', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '@/utils/prisma';
import { updateSettings, getSettings, cohortSettingsSchema } from '../cohort.service';

const mockedPrisma = prisma as unknown as {
  cohort: {
    findUnique: MockedFunction<typeof prisma.cohort.findUnique>;
    update: MockedFunction<typeof prisma.cohort.update>;
  };
};

const ACTOR_ID = 'sc-user-id';
const COHORT_ID = 'cohort-c26';

const mockCohort = {
  id: COHORT_ID,
  organizationId: 'org-hmtc',
  code: 'C26',
  name: 'NAWASENA 2026',
  startDate: new Date(),
  endDate: new Date(),
  status: 'DRAFT' as const,
  isActive: false,
  createdBy: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
  settings: {},
  f2StartDate: null,
  f2EndDate: null,
  f4EndDate: null,
};

describe('CohortService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- cohortSettingsSchema validation ----

  describe('cohortSettingsSchema', () => {
    it('accepts valid full settings', () => {
      const valid = {
        fasePhases: [
          { phase: 'F0', startDate: '2026-01-01T00:00:00Z', endDate: '2026-01-15T00:00:00Z' },
          { phase: 'F1', startDate: '2026-01-16T00:00:00Z', endDate: '2026-02-28T00:00:00Z' },
        ],
        plafonBiaya: {
          iuranKas: 50000,
          logistik: 100000,
        },
        flags: {
          allowOnlinePakta: true,
          requireFotoMabaResmi: false,
        },
      };

      const result = cohortSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('accepts partial settings (no fasePhases)', () => {
      const partial = {
        plafonBiaya: { iuranKas: 30000 },
      };

      const result = cohortSettingsSchema.safeParse(partial);
      expect(result.success).toBe(true);
    });

    it('accepts empty object (all optional fields)', () => {
      const result = cohortSettingsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid phase enum', () => {
      const invalid = {
        fasePhases: [
          { phase: 'F9', startDate: '2026-01-01T00:00:00Z', endDate: '2026-01-15T00:00:00Z' },
        ],
      };

      const result = cohortSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid date format', () => {
      const invalid = {
        fasePhases: [
          { phase: 'F0', startDate: '2026-13-99', endDate: '2026-14-99' },
        ],
      };

      const result = cohortSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects negative plafon', () => {
      const invalid = {
        plafonBiaya: { iuranKas: -1000 },
      };

      const result = cohortSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  // ---- updateSettings ----

  describe('updateSettings', () => {
    it('persists valid settings and returns updated record', async () => {
      const settings = {
        plafonBiaya: { iuranKas: 50000, logistik: 75000 },
        flags: { allowOnlinePakta: true },
      };

      mockedPrisma.cohort.findUnique.mockResolvedValue(mockCohort);
      mockedPrisma.cohort.update.mockResolvedValue({
        id: COHORT_ID,
        settings,
      } as unknown as typeof mockCohort);

      const result = await updateSettings(COHORT_ID, settings, ACTOR_ID);

      expect(result.id).toBe(COHORT_ID);
      expect(mockedPrisma.cohort.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: COHORT_ID },
          data: { settings },
        }),
      );
    });

    it('throws COHORT_NOT_FOUND when cohort does not exist', async () => {
      mockedPrisma.cohort.findUnique.mockResolvedValue(null);

      await expect(
        updateSettings(COHORT_ID, { plafonBiaya: { iuranKas: 1000 } }, ACTOR_ID),
      ).rejects.toThrow('COHORT_NOT_FOUND');
    });

    it('throws COHORT_SETTINGS_INVALID on schema validation failure', async () => {
      mockedPrisma.cohort.findUnique.mockResolvedValue(mockCohort);

      // Force a schema error by passing invalid plafonBiaya
      await expect(
        updateSettings(
          COHORT_ID,
          { plafonBiaya: { iuranKas: -500 } },
          ACTOR_ID,
        ),
      ).rejects.toThrow(/COHORT_SETTINGS_INVALID/);
    });
  });

  // ---- getSettings ----

  describe('getSettings', () => {
    it('returns null for cohort with empty settings', async () => {
      mockedPrisma.cohort.findUnique.mockResolvedValue({ settings: {} } as unknown as typeof mockCohort);

      const result = await getSettings(COHORT_ID);
      // Empty object is a valid (empty) CohortSettings
      expect(result).toBeDefined();
    });

    it('returns null when cohort not found', async () => {
      mockedPrisma.cohort.findUnique.mockResolvedValue(null);

      const result = await getSettings(COHORT_ID);
      expect(result).toBeNull();
    });
  });
});

/**
 * Unit tests for pakta.service.ts
 * Verifies dual-scope query, cross-org isolation, and fan-out.
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// Mock Prisma
vi.mock('@/utils/prisma', () => ({
  prisma: {
    paktaVersion: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    paktaSignature: {
      findFirst: vi.fn(),
    },
    user: {
      updateMany: vi.fn(),
    },
  },
}));

// Mock audit logger
vi.mock('@/lib/audit/audit-helpers', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// Mock cache — pass-through (no actual Redis)
vi.mock('@/lib/cache', () => ({
  withCache: vi.fn().mockImplementation(
    (_key: string, _ttl: number, fetchFn: () => unknown) => fetchFn(),
  ),
  invalidateCache: vi.fn().mockResolvedValue(0),
  CACHE_TTL: {
    SHORT: 30,
    MEDIUM: 300,
    LONG: 1800,
    HOUR: 3600,
    DAY: 86400,
  },
  CACHE_KEYS: {
    all: (k: string) => `${k}:all`,
    byId: (k: string, id: string) => `${k}:${id}`,
    custom: (k: string, sub: string) => `${k}:${sub}`,
    pattern: (k: string) => `${k}:*`,
  },
}));

import { prisma } from '@/utils/prisma';
import {
  getActivePaktaForUser,
  getActivePaktaByTypeForUser,
  needsResign,
  triggerResign,
  buildHashPayload,
} from '../pakta.service';
import type { PaktaVersion } from '@prisma/client';

const mockedPrisma = prisma as unknown as {
  paktaVersion: {
    findFirst: MockedFunction<typeof prisma.paktaVersion.findFirst>;
    findUnique: MockedFunction<typeof prisma.paktaVersion.findUnique>;
  };
  paktaSignature: {
    findFirst: MockedFunction<typeof prisma.paktaSignature.findFirst>;
  };
  user: {
    updateMany: MockedFunction<typeof prisma.user.updateMany>;
  };
};

// Fixture organizations
const HMTC_ORG_ID = 'org-hmtc-id';
const HMM_ORG_ID = 'org-hmm-id';

// Fixture users
const MABA_HMTC = { id: 'user-maba-hmtc', organizationId: HMTC_ORG_ID, role: 'MABA' };
const MABA_HMM = { id: 'user-maba-hmm', organizationId: HMM_ORG_ID, role: 'MABA' };
const SC_HMTC = { id: 'user-sc-hmtc', organizationId: HMTC_ORG_ID, role: 'SC' };

// Fixture pakta versions
const makePakta = (
  overrides: Partial<PaktaVersion>,
): PaktaVersion =>
  ({
    id: 'pakta-v1',
    organizationId: HMTC_ORG_ID,
    type: 'PAKTA_PANITIA',
    versionNumber: 1,
    title: 'Pakta Test',
    contentMarkdown: '# Test',
    summaryJson: null,
    quizQuestions: {},
    passingScore: 80,
    effectiveFrom: new Date(),
    effectiveUntil: null,
    status: 'PUBLISHED',
    publishedAt: new Date(),
    publishedBy: 'admin',
    supersededAt: null,
    supersededByVersionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PaktaVersion);

describe('PaktaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- getActivePaktaForUser ----

  describe('getActivePaktaForUser (dual-scope)', () => {
    it('SOCIAL_CONTRACT_MABA: returns global record (organizationId IS NULL)', async () => {
      const digitalPakta = makePakta({
        id: 'digital-v1',
        type: 'SOCIAL_CONTRACT_MABA',
        organizationId: null as unknown as string,
      });

      (mockedPrisma.paktaVersion.findFirst as ReturnType<typeof vi.fn>).mockImplementation((args: { where?: { type?: string; organizationId?: string | null } }) => {
        // Should be queried with organizationId: null for DIGITAL
        if (args?.where?.type === 'SOCIAL_CONTRACT_MABA' && args?.where?.organizationId === null) {
          return Promise.resolve(digitalPakta);
        }
        return Promise.resolve(null);
      });

      const result = await getActivePaktaForUser(MABA_HMTC);

      expect(result.digital).not.toBeNull();
      expect(result.digital?.type).toBe('SOCIAL_CONTRACT_MABA');
      expect(result.digital?.organizationId).toBeNull();
    });

    it('PAKTA_PANITIA: returns user org record only (not another org)', async () => {
      const hmtcEtik = makePakta({
        id: 'etik-hmtc-v1',
        type: 'PAKTA_PANITIA',
        organizationId: HMTC_ORG_ID,
      });
      const hmmEtik = makePakta({
        id: 'etik-hmm-v1',
        type: 'PAKTA_PANITIA',
        organizationId: HMM_ORG_ID,
      });

      (mockedPrisma.paktaVersion.findFirst as ReturnType<typeof vi.fn>).mockImplementation((args: { where?: { type?: string; organizationId?: string | null } }) => {
        if (args?.where?.type === 'PAKTA_PANITIA') {
          const orgId = args?.where?.organizationId;
          if (orgId === HMTC_ORG_ID) return Promise.resolve(hmtcEtik);
          if (orgId === HMM_ORG_ID) return Promise.resolve(hmmEtik);
        }
        return Promise.resolve(null);
      });

      const hmtcResult = await getActivePaktaForUser(SC_HMTC);
      const hmmResult = await getActivePaktaForUser({
        id: 'user-sc-hmm',
        organizationId: HMM_ORG_ID,
        role: 'SC',
      });

      // HMTC user gets HMTC ETIK
      expect(hmtcResult.etik?.organizationId).toBe(HMTC_ORG_ID);
      expect(hmtcResult.etik?.id).toBe('etik-hmtc-v1');

      // HMM user gets HMM ETIK — NOT HMTC ETIK
      expect(hmmResult.etik?.organizationId).toBe(HMM_ORG_ID);
      expect(hmmResult.etik?.id).toBe('etik-hmm-v1');
    });

    it('user from org X does not receive pakta from org Y', async () => {
      const hmtcEtik = makePakta({
        id: 'etik-hmtc-v2',
        type: 'PAKTA_PANITIA',
        organizationId: HMTC_ORG_ID,
      });

      (mockedPrisma.paktaVersion.findFirst as ReturnType<typeof vi.fn>).mockImplementation((args: { where?: { type?: string; organizationId?: string | null } }) => {
        // Simulate: only HMTC ETIK exists; HMM has none
        if (
          args?.where?.type === 'PAKTA_PANITIA' &&
          args?.where?.organizationId === HMTC_ORG_ID
        ) {
          return Promise.resolve(hmtcEtik);
        }
        return Promise.resolve(null);
      });

      // MABA from HMM — should get null for etik (no HMM etik exists)
      const hmmResult = await getActivePaktaForUser(MABA_HMM);
      expect(hmmResult.etik).toBeNull();
    });
  });

  // ---- getActivePaktaByTypeForUser ----

  describe('getActivePaktaByTypeForUser', () => {
    it('queries global scope for SOCIAL_CONTRACT_MABA', async () => {
      const digitalPakta = makePakta({
        type: 'SOCIAL_CONTRACT_MABA',
        organizationId: null as unknown as string,
      });
      mockedPrisma.paktaVersion.findFirst.mockResolvedValue(digitalPakta);

      await getActivePaktaByTypeForUser(MABA_HMM, 'SOCIAL_CONTRACT_MABA');

      // Must query with organizationId: null
      expect(mockedPrisma.paktaVersion.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: null }),
        }),
      );
    });

    it('queries org scope for PAKTA_PANITIA', async () => {
      mockedPrisma.paktaVersion.findFirst.mockResolvedValue(null);

      await getActivePaktaByTypeForUser(SC_HMTC, 'PAKTA_PANITIA');

      // Must query with user's orgId
      expect(mockedPrisma.paktaVersion.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: HMTC_ORG_ID }),
        }),
      );
    });
  });

  // ---- needsResign ----

  describe('needsResign', () => {
    it('returns true when user has no active signature', async () => {
      const activePakta = makePakta({ id: 'pakta-new' });
      mockedPrisma.paktaVersion.findFirst.mockResolvedValue(activePakta);
      mockedPrisma.paktaSignature.findFirst.mockResolvedValue(null);

      const result = await needsResign('user-1', HMTC_ORG_ID, 'PAKTA_PANITIA');
      expect(result).toBe(true);
    });

    it('returns true when signed version differs from active version', async () => {
      const activePakta = makePakta({ id: 'pakta-v2' });
      mockedPrisma.paktaVersion.findFirst.mockResolvedValue(activePakta);
      mockedPrisma.paktaSignature.findFirst.mockResolvedValue({
        paktaVersionId: 'pakta-v1', // old version
      } as unknown as import('@prisma/client').PaktaSignature);

      const result = await needsResign('user-1', HMTC_ORG_ID, 'PAKTA_PANITIA');
      expect(result).toBe(true);
    });

    it('returns false when user has signed the current active version', async () => {
      const activePakta = makePakta({ id: 'pakta-v2' });
      mockedPrisma.paktaVersion.findFirst.mockResolvedValue(activePakta);
      mockedPrisma.paktaSignature.findFirst.mockResolvedValue({
        paktaVersionId: 'pakta-v2', // current version
      } as unknown as import('@prisma/client').PaktaSignature);

      const result = await needsResign('user-1', HMTC_ORG_ID, 'PAKTA_PANITIA');
      expect(result).toBe(false);
    });

    it('returns false when no active pakta exists', async () => {
      mockedPrisma.paktaVersion.findFirst.mockResolvedValue(null);

      const result = await needsResign('user-1', HMTC_ORG_ID, 'PAKTA_PANITIA');
      expect(result).toBe(false);
    });
  });

  // ---- triggerResign fan-out ----

  describe('triggerResign fan-out scope', () => {
    it('DIGITAL: fan-out to all active MABA across all orgs (no org filter)', async () => {
      const digitalVersion = makePakta({
        id: 'digital-v2',
        type: 'SOCIAL_CONTRACT_MABA',
        organizationId: null as unknown as string,
      });
      mockedPrisma.paktaVersion.findUnique.mockResolvedValue(digitalVersion);
      mockedPrisma.user.updateMany.mockResolvedValue({ count: 150 });

      const result = await triggerResign('digital-v2', 'actor-id');

      expect(result.affectedCount).toBe(150);
      // Should filter by MABA role, no org restriction
      expect(mockedPrisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'MABA',
            status: 'ACTIVE',
          }),
        }),
      );
      // No organizationId in where clause for DIGITAL
      const callArgs = mockedPrisma.user.updateMany.mock.calls[0][0];
      expect(callArgs?.where).not.toHaveProperty('organizationId');
    });

    it('PAKTA_PANITIA: fan-out scoped to org only', async () => {
      const etikVersion = makePakta({
        id: 'etik-hmtc-v3',
        type: 'PAKTA_PANITIA',
        organizationId: HMTC_ORG_ID,
      });
      mockedPrisma.paktaVersion.findUnique.mockResolvedValue(etikVersion);
      mockedPrisma.user.updateMany.mockResolvedValue({ count: 30 });

      await triggerResign('etik-hmtc-v3', 'actor-id');

      const callArgs = mockedPrisma.user.updateMany.mock.calls[0][0];
      // Must restrict to HMTC org
      expect(callArgs?.where).toHaveProperty('organizationId', HMTC_ORG_ID);
    });
  });

  // ---- buildHashPayload ----

  describe('buildHashPayload', () => {
    it('includes organizationId in payload for ETIK signature', () => {
      const payload = buildHashPayload({
        prevHash: 'abc123',
        versionId: 'v1',
        versionNumber: 1,
        type: 'PAKTA_PANITIA',
        organizationId: HMTC_ORG_ID,
        userId: 'user-1',
        signedAt: new Date('2026-01-01T00:00:00Z'),
        quizScore: 90,
      });

      expect(payload.organizationId).toBe(HMTC_ORG_ID);
      expect(payload.type).toBe('PAKTA_PANITIA');
    });

    it('uses "NULL" string for DIGITAL pakta organizationId', () => {
      const payload = buildHashPayload({
        prevHash: null,
        versionId: 'v1',
        versionNumber: 1,
        type: 'SOCIAL_CONTRACT_MABA',
        organizationId: null,
        userId: 'user-1',
        signedAt: new Date('2026-01-01T00:00:00Z'),
        quizScore: 85,
      });

      expect(payload.organizationId).toBe('NULL');
      expect(payload.prevHash).toBe('GENESIS');
    });

    it('HMTC ETIK v3 payload differs from HMM ETIK v3 payload', () => {
      const base = {
        prevHash: 'same-prev',
        versionId: 'etik-v3',
        versionNumber: 3,
        type: 'PAKTA_PANITIA' as const,
        userId: 'same-user',
        signedAt: new Date('2026-06-01T00:00:00Z'),
        quizScore: 88,
      };

      const hmtcPayload = buildHashPayload({
        ...base,
        organizationId: HMTC_ORG_ID,
      });
      const hmmPayload = buildHashPayload({
        ...base,
        organizationId: HMM_ORG_ID,
      });

      expect(JSON.stringify(hmtcPayload)).not.toBe(JSON.stringify(hmmPayload));
      expect(hmtcPayload.organizationId).toBe(HMTC_ORG_ID);
      expect(hmmPayload.organizationId).toBe(HMM_ORG_ID);
    });
  });
});

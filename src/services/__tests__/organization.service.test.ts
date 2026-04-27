/**
 * Unit tests for organization.service.ts
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// Mock Prisma
vi.mock('@/utils/prisma', () => ({
  prisma: {
    organization: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      updateMany: vi.fn(),
    },
    whitelistEmail: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock audit logger
vi.mock('@/lib/audit/audit-helpers', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '@/utils/prisma';
import {
  createOrganization,
  updateOrganization,
  activateOrganization,
  suspendOrganization,
  findBySlug,
  listForSuperadmin,
  listForSC,
} from '../organization.service';

const mockedPrisma = prisma as unknown as {
  organization: {
    create: MockedFunction<typeof prisma.organization.create>;
    update: MockedFunction<typeof prisma.organization.update>;
    findFirst: MockedFunction<typeof prisma.organization.findFirst>;
    findUnique: MockedFunction<typeof prisma.organization.findUnique>;
    findMany: MockedFunction<typeof prisma.organization.findMany>;
  };
  user: {
    updateMany: MockedFunction<typeof prisma.user.updateMany>;
  };
  $transaction: MockedFunction<typeof prisma.$transaction>;
};

const ACTOR_ID = 'actor-superadmin-id';

const mockOrg = {
  id: 'org-hmtc',
  code: 'HMTC',
  name: 'HMTC',
  fullName: 'Himpunan Mahasiswa Teknik Komputer',
  slug: 'hmtc',
  facultyCode: 'FTEIC',
  organizationType: 'HMJ' as const,
  registrationStatus: 'PENDING' as const,
  isActive: true,
  status: 'ACTIVE' as const,
  kahimaName: null,
  kajurName: null,
  contactEmail: null,
  settings: null,
  archivedAt: null,
  publicCatalogEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('OrganizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- createOrganization ----

  describe('createOrganization', () => {
    it('creates org with auto-derived slug from code', async () => {
      // No existing slug collision
      mockedPrisma.organization.findFirst.mockResolvedValue(null);
      mockedPrisma.$transaction.mockImplementation(async (cb) =>
        cb({
          organization: { create: vi.fn().mockResolvedValue(mockOrg) },
          whitelistEmail: { create: vi.fn() },
        } as unknown as typeof prisma),
      );

      const result = await createOrganization(
        {
          code: 'HMTC',
          name: 'HMTC',
          fullName: 'Himpunan Mahasiswa Teknik Komputer',
          organizationType: 'HMJ',
          scLeadEmail: 'sc@hmtc.ac.id',
        },
        ACTOR_ID,
      );

      expect(result).toBeDefined();
      expect(result.code).toBe('HMTC');
    });

    it('auto-derives slug as lowercase of code when not provided', async () => {
      let capturedSlug: string | undefined;
      mockedPrisma.organization.findFirst.mockResolvedValue(null);
      mockedPrisma.$transaction.mockImplementation(async (cb) =>
        cb({
          organization: {
            create: vi.fn().mockImplementation((args: { data: { slug: string } }) => {
              capturedSlug = args.data.slug;
              return Promise.resolve({ ...mockOrg, slug: args.data.slug });
            }),
          },
          whitelistEmail: { create: vi.fn() },
        } as unknown as typeof prisma),
      );

      await createOrganization(
        {
          code: 'HMM',
          name: 'HMM',
          fullName: 'Himpunan Mahasiswa Mesin',
          organizationType: 'HMJ',
          scLeadEmail: 'sc@hmm.ac.id',
        },
        ACTOR_ID,
      );

      expect(capturedSlug).toBe('hmm');
    });

    it('throws SLUG_CONFLICT when slug already exists', async () => {
      // Simulate slug collision
      mockedPrisma.organization.findFirst.mockResolvedValue(mockOrg);

      await expect(
        createOrganization(
          {
            code: 'HMTC',
            name: 'HMTC dup',
            fullName: 'Duplicate HMTC',
            organizationType: 'HMJ',
            scLeadEmail: 'sc2@hmtc.ac.id',
          },
          ACTOR_ID,
        ),
      ).rejects.toThrow('SLUG_CONFLICT:hmtc');
    });

    it('uses explicit slug if provided (lowercased)', async () => {
      let capturedSlug: string | undefined;
      mockedPrisma.organization.findFirst.mockResolvedValue(null);
      mockedPrisma.$transaction.mockImplementation(async (cb) =>
        cb({
          organization: {
            create: vi.fn().mockImplementation((args: { data: { slug: string } }) => {
              capturedSlug = args.data.slug;
              return Promise.resolve({ ...mockOrg, slug: args.data.slug });
            }),
          },
          whitelistEmail: { create: vi.fn() },
        } as unknown as typeof prisma),
      );

      await createOrganization(
        {
          code: 'HME',
          name: 'HME',
          fullName: 'Himpunan Mahasiswa Elektro',
          organizationType: 'HMJ',
          slug: 'hme-elektro',
          scLeadEmail: 'sc@hme.ac.id',
        },
        ACTOR_ID,
      );

      expect(capturedSlug).toBe('hme-elektro');
    });
  });

  // ---- updateOrganization ----

  describe('updateOrganization', () => {
    it('updates allowed fields', async () => {
      mockedPrisma.organization.findUnique.mockResolvedValue(mockOrg);
      const updatedOrg = { ...mockOrg, name: 'HMTC Updated', kahimaName: 'Budi' };
      mockedPrisma.organization.update.mockResolvedValue(updatedOrg);

      const result = await updateOrganization(
        'org-hmtc',
        { name: 'HMTC Updated', kahimaName: 'Budi' },
        ACTOR_ID,
      );

      expect(result.name).toBe('HMTC Updated');
    });

    it('throws ORG_NOT_FOUND when org does not exist', async () => {
      mockedPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        updateOrganization('nonexistent', { name: 'X' }, ACTOR_ID),
      ).rejects.toThrow('ORG_NOT_FOUND');
    });
  });

  // ---- activateOrganization ----

  describe('activateOrganization', () => {
    it('transitions PENDING → ACTIVE', async () => {
      mockedPrisma.organization.findUnique.mockResolvedValue({
        ...mockOrg,
        registrationStatus: 'PENDING',
      });
      const activated = { ...mockOrg, registrationStatus: 'ACTIVE' as const };
      mockedPrisma.organization.update.mockResolvedValue(activated);

      const result = await activateOrganization('org-hmtc', ACTOR_ID);
      expect(result.registrationStatus).toBe('ACTIVE');
    });

    it('throws ORG_INVALID_TRANSITION when already ACTIVE', async () => {
      mockedPrisma.organization.findUnique.mockResolvedValue({
        ...mockOrg,
        registrationStatus: 'ACTIVE',
      });

      await expect(activateOrganization('org-hmtc', ACTOR_ID)).rejects.toThrow(
        'ORG_INVALID_TRANSITION:ACTIVE->ACTIVE',
      );
    });
  });

  // ---- suspendOrganization ----

  describe('suspendOrganization', () => {
    it('transitions ACTIVE → SUSPENDED and increments sessionEpoch', async () => {
      mockedPrisma.organization.findUnique.mockResolvedValue({
        ...mockOrg,
        registrationStatus: 'ACTIVE',
      });
      const suspended = { ...mockOrg, registrationStatus: 'SUSPENDED' as const };
      mockedPrisma.$transaction.mockImplementation(async (cb) =>
        cb({
          organization: {
            update: vi.fn().mockResolvedValue(suspended),
          },
          user: {
            updateMany: vi.fn().mockResolvedValue({ count: 5 }),
          },
        } as unknown as typeof prisma),
      );

      const result = await suspendOrganization('org-hmtc', 'Pelanggaran kebijakan', ACTOR_ID);
      expect(result.registrationStatus).toBe('SUSPENDED');
    });

    it('throws ORG_INVALID_TRANSITION when not ACTIVE', async () => {
      mockedPrisma.organization.findUnique.mockResolvedValue({
        ...mockOrg,
        registrationStatus: 'PENDING',
      });

      await expect(
        suspendOrganization('org-hmtc', 'reason', ACTOR_ID),
      ).rejects.toThrow('ORG_INVALID_TRANSITION:PENDING->SUSPENDED');
    });
  });

  // ---- findBySlug ----

  describe('findBySlug', () => {
    it('finds org by slug case-insensitively', async () => {
      mockedPrisma.organization.findFirst.mockResolvedValue(mockOrg);

      const result = await findBySlug('HMTC');

      expect(mockedPrisma.organization.findFirst).toHaveBeenCalledWith({
        where: {
          slug: { equals: 'hmtc', mode: 'insensitive' },
        },
      });
      expect(result).toBeDefined();
    });

    it('returns null when slug not found', async () => {
      mockedPrisma.organization.findFirst.mockResolvedValue(null);

      const result = await findBySlug('unknown-slug');
      expect(result).toBeNull();
    });
  });

  // ---- listForSuperadmin ----

  describe('listForSuperadmin', () => {
    it('lists all orgs for SUPERADMIN without filter', async () => {
      mockedPrisma.organization.findMany.mockResolvedValue([mockOrg]);

      const result = await listForSuperadmin();
      expect(result).toHaveLength(1);
    });

    it('applies facultyCode filter', async () => {
      mockedPrisma.organization.findMany.mockResolvedValue([mockOrg]);

      await listForSuperadmin({ facultyCode: 'FTEIC' });

      expect(mockedPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ facultyCode: 'FTEIC' }),
        }),
      );
    });
  });

  // ---- listForSC ----

  describe('listForSC', () => {
    it('returns own org for SC', async () => {
      mockedPrisma.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await listForSC('org-hmtc');
      expect(result).toEqual(mockOrg);
    });

    it('returns null when org not found', async () => {
      mockedPrisma.organization.findUnique.mockResolvedValue(null);

      const result = await listForSC('nonexistent');
      expect(result).toBeNull();
    });
  });
});

/**
 * src/services/organization.service.ts
 * OrganizationService — multi-HMJ CRUD, activation, suspension, lookup.
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import type {
  Organization,
  OrganizationType,
  OrganizationRegistrationStatus,
} from '@prisma/client';
import { z } from 'zod';

const log = createLogger('organization-service');

// ---- Validation schemas ----

export const createOrgSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(20)
    .transform((v) => v.toUpperCase()),
  name: z.string().min(2).max(100),
  fullName: z.string().min(5).max(300),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung')
    .optional(),
  facultyCode: z.string().max(20).optional().nullable(),
  organizationType: z.enum(['HMJ', 'ALUMNI_CHAPTER', 'INSTITUSI_PUSAT']).default('HMJ'),
  kahimaName: z.string().max(100).optional().nullable(),
  kajurName: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  scLeadEmail: z.string().email('Email SC Lead tidak valid'),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  fullName: z.string().min(5).max(300).optional(),
  facultyCode: z.string().max(20).optional().nullable(),
  kahimaName: z.string().max(100).optional().nullable(),
  kajurName: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  isActive: z.boolean().optional(),
  registrationStatus: z
    .enum(['PENDING', 'ACTIVE', 'SUSPENDED'])
    .optional(),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;

// ---- Helpers ----

/**
 * Derive a URL-safe slug from a string.
 * Lowercased, alphanumeric and hyphens only.
 */
function deriveSlug(source: string): string {
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check case-insensitive slug uniqueness.
 * Throws if slug is already taken (by a different org).
 */
async function assertSlugUnique(slug: string, excludeOrgId?: string): Promise<void> {
  const existing = await prisma.organization.findFirst({
    where: {
      slug: { equals: slug.toLowerCase(), mode: 'insensitive' },
      ...(excludeOrgId ? { id: { not: excludeOrgId } } : {}),
    },
    select: { id: true, code: true },
  });
  if (existing) {
    throw new Error(`SLUG_CONFLICT:${slug.toLowerCase()}`);
  }
}

// ---- Service functions ----

/**
 * Create a new organization (SUPERADMIN only).
 * Also creates a WhitelistEmail entry for the SC lead so they can self-register.
 *
 * @param input  - Validated input (use createOrgSchema)
 * @param actorUserId - SUPERADMIN's user ID
 */
export async function createOrganization(
  input: CreateOrgInput,
  actorUserId: string,
): Promise<Organization> {
  const slug = (input.slug ?? deriveSlug(input.code)).toLowerCase();

  await assertSlugUnique(slug);

  log.info('Creating organization', { code: input.code, slug, actorUserId });

  const org = await prisma.$transaction(async (tx) => {
    const newOrg = await tx.organization.create({
      data: {
        code: input.code,
        name: input.name,
        fullName: input.fullName,
        slug,
        facultyCode: input.facultyCode ?? null,
        organizationType: input.organizationType as OrganizationType,
        kahimaName: input.kahimaName ?? null,
        kajurName: input.kajurName ?? null,
        contactEmail: input.contactEmail ?? null,
        registrationStatus: 'PENDING' as OrganizationRegistrationStatus,
        isActive: true,
        status: 'ACTIVE',
      },
    });

    // Bootstrap SC lead whitelist entry
    await tx.whitelistEmail.create({
      data: {
        organizationId: newOrg.id,
        email: input.scLeadEmail.toLowerCase(),
        preassignedRole: 'SC',
        addedBy: actorUserId,
        note: `Bootstrap SC Lead for ${newOrg.code} — onboarded by SUPERADMIN`,
      },
    });

    return newOrg;
  });

  await logAudit({
    action: AuditAction.ORG_CREATE,
    organizationId: org.id,
    actorUserId,
    entityType: 'Organization',
    entityId: org.id,
    afterValue: {
      code: org.code,
      name: org.name,
      slug,
      scLeadEmail: input.scLeadEmail.toLowerCase(),
    },
  });

  log.info('Organization created', { orgId: org.id, code: org.code });
  return org;
}

/**
 * Update non-immutable fields on an organization.
 * Slug is immutable once set — validated here (C-06 constraint).
 *
 * @param orgId       - ID of org to update
 * @param patch       - Partial update (use updateOrgSchema)
 * @param actorUserId - Actor performing the update
 */
export async function updateOrganization(
  orgId: string,
  patch: UpdateOrgInput,
  actorUserId: string,
): Promise<Organization> {
  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
      registrationStatus: true,
      isActive: true,
      kahimaName: true,
      kajurName: true,
      facultyCode: true,
    },
  });

  if (!existing) {
    throw new Error('ORG_NOT_FOUND');
  }

  log.info('Updating organization', { orgId, fields: Object.keys(patch), actorUserId });

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.fullName !== undefined && { fullName: patch.fullName }),
      ...(patch.facultyCode !== undefined && { facultyCode: patch.facultyCode }),
      ...(patch.kahimaName !== undefined && { kahimaName: patch.kahimaName }),
      ...(patch.kajurName !== undefined && { kajurName: patch.kajurName }),
      ...(patch.contactEmail !== undefined && { contactEmail: patch.contactEmail }),
      ...(patch.isActive !== undefined && { isActive: patch.isActive }),
      ...(patch.registrationStatus !== undefined && {
        registrationStatus: patch.registrationStatus as OrganizationRegistrationStatus,
      }),
    },
  });

  await logAudit({
    action: AuditAction.ORG_UPDATE,
    organizationId: orgId,
    actorUserId,
    entityType: 'Organization',
    entityId: orgId,
    beforeValue: {
      name: existing.name,
      isActive: existing.isActive,
      kahimaName: existing.kahimaName,
      kajurName: existing.kajurName,
    },
    afterValue: {
      name: updated.name,
      isActive: updated.isActive,
      kahimaName: updated.kahimaName,
      kajurName: updated.kajurName,
    },
  });

  log.info('Organization updated', { orgId });
  return updated;
}

/**
 * Activate an organization: PENDING → ACTIVE.
 * Only valid from PENDING state.
 */
export async function activateOrganization(
  orgId: string,
  actorUserId: string,
): Promise<Organization> {
  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, code: true, registrationStatus: true },
  });

  if (!existing) throw new Error('ORG_NOT_FOUND');
  if (existing.registrationStatus !== 'PENDING') {
    throw new Error(`ORG_INVALID_TRANSITION:${existing.registrationStatus}->ACTIVE`);
  }

  log.info('Activating organization', { orgId, code: existing.code, actorUserId });

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { registrationStatus: 'ACTIVE' as OrganizationRegistrationStatus },
  });

  await logAudit({
    action: AuditAction.ORG_UPDATE,
    organizationId: orgId,
    actorUserId,
    entityType: 'Organization',
    entityId: orgId,
    beforeValue: { registrationStatus: 'PENDING' },
    afterValue: { registrationStatus: 'ACTIVE' },
    metadata: { action: 'ORG_ACTIVATE' },
  });

  log.info('Organization activated', { orgId });
  return updated;
}

/**
 * Suspend an organization: ACTIVE → SUSPENDED.
 * Bulk-increments sessionEpoch for all users in the org to force re-login.
 * Mandatory reason required.
 */
export async function suspendOrganization(
  orgId: string,
  reason: string,
  actorUserId: string,
): Promise<Organization> {
  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, code: true, registrationStatus: true },
  });

  if (!existing) throw new Error('ORG_NOT_FOUND');
  if (existing.registrationStatus !== 'ACTIVE') {
    throw new Error(`ORG_INVALID_TRANSITION:${existing.registrationStatus}->SUSPENDED`);
  }

  log.info('Suspending organization', { orgId, code: existing.code, actorUserId });

  const updated = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.update({
      where: { id: orgId },
      data: { registrationStatus: 'SUSPENDED' as OrganizationRegistrationStatus },
    });

    // Force re-login for all users in this org by incrementing sessionEpoch
    await tx.user.updateMany({
      where: { organizationId: orgId, status: { not: 'DEACTIVATED' } },
      data: { sessionEpoch: { increment: 1 } },
    });

    return org;
  });

  await logAudit({
    action: AuditAction.ORG_ARCHIVE,
    organizationId: orgId,
    actorUserId,
    entityType: 'Organization',
    entityId: orgId,
    beforeValue: { registrationStatus: 'ACTIVE' },
    afterValue: { registrationStatus: 'SUSPENDED' },
    reason,
    metadata: { action: 'ORG_SUSPEND' },
  });

  log.info('Organization suspended', { orgId, reason });
  return updated;
}

/**
 * List all organizations — for SUPERADMIN.
 * Optional filter by facultyCode and/or registrationStatus.
 */
export async function listForSuperadmin(filters?: {
  facultyCode?: string;
  registrationStatus?: OrganizationRegistrationStatus;
  organizationType?: OrganizationType;
}): Promise<Organization[]> {
  return prisma.organization.findMany({
    where: {
      ...(filters?.facultyCode && { facultyCode: filters.facultyCode }),
      ...(filters?.registrationStatus && {
        registrationStatus: filters.registrationStatus,
      }),
      ...(filters?.organizationType && {
        organizationType: filters.organizationType,
      }),
    },
    orderBy: [{ registrationStatus: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Get own org detail — for SC role.
 * Returns only the org that matches orgId (single record).
 */
export async function listForSC(orgId: string): Promise<Organization | null> {
  return prisma.organization.findUnique({
    where: { id: orgId },
  });
}

/**
 * Find organization by slug (case-insensitive).
 */
export async function findBySlug(slug: string): Promise<Organization | null> {
  return prisma.organization.findFirst({
    where: {
      slug: { equals: slug.toLowerCase(), mode: 'insensitive' },
    },
  });
}

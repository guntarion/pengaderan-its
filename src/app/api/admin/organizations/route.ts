/**
 * /api/admin/organizations
 * GET  — list organizations (SUPERADMIN: all; SC: own org only)
 * POST — create organization (SUPERADMIN only)
 *
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { createApiHandler, ApiResponse, validateBody, validateQuery, ConflictError, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import {
  createOrgSchema,
  createOrganization,
  listForSuperadmin,
  listForSC,
} from '@/services/organization.service';
import type { OrganizationRegistrationStatus, OrganizationType } from '@prisma/client';

const listQuerySchema = z.object({
  facultyCode: z.string().optional(),
  registrationStatus: z
    .enum(['PENDING', 'ACTIVE', 'SUSPENDED'])
    .optional(),
  organizationType: z
    .enum(['HMJ', 'ALUMNI_CHAPTER', 'INSTITUSI_PUSAT'])
    .optional(),
});

export const GET = createApiHandler({
  roles: ['SUPERADMIN', 'SC'],
  handler: async (req, { user, log }) => {
    const query = validateQuery(req, listQuerySchema);

    if (user.role === 'SUPERADMIN') {
      log.info('SUPERADMIN listing all organizations', { filters: query });
      const orgs = await listForSuperadmin({
        facultyCode: query.facultyCode,
        registrationStatus: query.registrationStatus as OrganizationRegistrationStatus | undefined,
        organizationType: query.organizationType as OrganizationType | undefined,
      });
      return ApiResponse.success(orgs);
    }

    // SC: return their own org only
    const orgId = user.organizationId ?? '';
    if (!orgId) throw BadRequestError('organizationId tidak ditemukan di sesi');

    log.info('SC fetching own organization', { orgId });
    const org = await listForSC(orgId);
    return ApiResponse.success(org ? [org] : []);
  },
});

export const POST = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, createOrgSchema);
    log.info('Creating organization', { code: body.code, actorId: user.id });

    // Ensure organizationType has a default value if not provided
    const orgInput = {
      ...body,
      organizationType: body.organizationType ?? 'HMJ' as const,
    };
    try {
      const org = await createOrganization(orgInput, user.id);
      return ApiResponse.success(org, 201);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('SLUG_CONFLICT:')) {
        const slug = err.message.split(':')[1];
        throw ConflictError(`Slug '${slug}' sudah digunakan oleh organisasi lain`);
      }
      throw err;
    }
  },
});

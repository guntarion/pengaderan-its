/**
 * /api/admin/organizations/[id]
 * GET   — get organization detail (SUPERADMIN: any; SC: own org only)
 * PATCH — update organization (SUPERADMIN: any; SC: own org only, limited fields)
 *
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema, ForbiddenError, NotFoundError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import {
  updateOrgSchema,
  updateOrganization,
} from '@/services/organization.service';

export const GET = createApiHandler({
  roles: ['SUPERADMIN', 'SC'],
  handler: async (_req, { user, params, log }) => {
    const { id } = validateParams(params, idParamSchema);

    // SC can only view their own org
    if (user.role === 'SC' && user.organizationId !== id) {
      throw ForbiddenError();
    }

    log.info('Fetching organization detail', { orgId: id });

    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, cohorts: true, paktaVersions: true },
        },
      },
    });

    if (!org) throw NotFoundError('Organization');

    return ApiResponse.success(org);
  },
});

export const PATCH = createApiHandler({
  roles: ['SUPERADMIN', 'SC'],
  handler: async (req, { user, params, log }) => {
    const { id } = validateParams(params, idParamSchema);

    // SC can only update their own org
    if (user.role === 'SC' && user.organizationId !== id) {
      throw ForbiddenError();
    }

    // SC cannot change registrationStatus (SUPERADMIN privilege)
    const body = await validateBody(req, updateOrgSchema);
    if (user.role === 'SC' && body.registrationStatus !== undefined) {
      throw ForbiddenError();
    }

    log.info('Updating organization', { orgId: id, actorId: user.id, role: user.role });

    const updated = await updateOrganization(id, body, user.id);
    return ApiResponse.success(updated);
  },
});

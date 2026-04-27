/**
 * GET /api/admin/cohorts/[id]
 * Fetch single cohort with settings.
 * Roles: SC (own org), SUPERADMIN (any)
 *
 * Phase RV-E — M01 Revisi Multi-HMJ
 */

import { createApiHandler, ApiResponse, validateParams, idParamSchema } from '@/lib/api';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { getSettings } from '@/services/cohort.service';

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (_req, { user, params, log }) => {
    const { id: cohortId } = validateParams(params, idParamSchema);
    const orgId = user.organizationId ?? '';
    if (!orgId && user.role !== 'SUPERADMIN') throw BadRequestError('organizationId tidak ditemukan');

    log.info('Fetching cohort detail', { cohortId, actorId: user.id });

    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        isActive: true,
        startDate: true,
        endDate: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        settings: true,
        _count: { select: { users: true } },
      },
    });

    if (!cohort) throw NotFoundError('Cohort');

    // SC can only access own org's cohorts
    if (user.role === 'SC' && cohort.organizationId !== orgId) {
      throw ForbiddenError();
    }

    // Parse settings
    const settings = await getSettings(cohortId);

    return ApiResponse.success({ ...cohort, parsedSettings: settings });
  },
});

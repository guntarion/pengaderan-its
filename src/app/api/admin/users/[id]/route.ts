/**
 * GET /api/admin/users/[id]
 * Fetch a single user with field-level access control.
 *
 * Roles: SC, SUPERADMIN, PEMBINA, BLM, SATGAS
 * Demographics: SC, SATGAS, ELDER, PEMBINA, BLM, SUPERADMIN
 * Emergency contact: SC, SATGAS, SUPERADMIN (+ audit log)
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { sanitizeUserForViewer } from '@/lib/user/sanitize';

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN', 'PEMBINA', 'BLM', 'SATGAS'],
  handler: async (_req, { user, params, log }) => {
    const { id: targetUserId } = params;

    log.info('Fetching user detail', { targetUserId });

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        fullName: true,
        displayName: true,
        nrp: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        organizationId: true,
        currentCohortId: true,
        paktaPanitiaStatus: true,
        socialContractStatus: true,
        paktaPengader2027Status: true,
        isRantau: true,
        isKIP: true,
        hasDisability: true,
        disabilityNotes: true,
        province: true,
        emergencyContactName: true,
        emergencyContactRelation: true,
        emergencyContactPhone: true,
        demographicsUpdatedAt: true,
        currentCohort: { select: { code: true, name: true } },
        organization: { select: { code: true, name: true } },
      },
    });

    if (!targetUser) throw NotFoundError('User');

    // Org scoping — non-SUPERADMIN can only view users in their org
    if (
      user.role !== 'SUPERADMIN' &&
      targetUser.organizationId !== user.organizationId
    ) {
      throw ForbiddenError('Tidak dapat mengakses pengguna dari organisasi lain');
    }

    const sanitized = await sanitizeUserForViewer(
      targetUser as never,
      user.role as never,
      {
        viewerUserId: user.id,
        organizationId: targetUser.organizationId ?? '',
      }
    );

    // Attach org/cohort data to result (sanitizeUserForViewer only returns core User fields)
    return ApiResponse.success({
      ...sanitized,
      lastLoginAt: targetUser.lastLoginAt,
      organizationId: targetUser.organizationId,
      currentCohortId: targetUser.currentCohortId,
      paktaPanitiaStatus: targetUser.paktaPanitiaStatus,
      socialContractStatus: targetUser.socialContractStatus,
      paktaPengader2027Status: targetUser.paktaPengader2027Status,
      currentCohort: targetUser.currentCohort,
      organization: targetUser.organization,
    });
  },
});

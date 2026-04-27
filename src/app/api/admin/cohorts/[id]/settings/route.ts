/**
 * PATCH /api/admin/cohorts/[id]/settings
 * Update cohort settings JSON (SC own org, SUPERADMIN any).
 * Validates via cohortSettingsSchema in cohort.service.ts.
 *
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema, BadRequestError, ForbiddenError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { cohortSettingsSchema, updateSettings } from '@/services/cohort.service';

export const PATCH = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id: cohortId } = validateParams(params, idParamSchema);

    // Validate settings payload against schema
    const rawBody = await validateBody(req, cohortSettingsSchema);

    // Fetch cohort to verify ownership for SC
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { id: true, organizationId: true, code: true },
    });

    if (!cohort) throw BadRequestError('Cohort tidak ditemukan');

    // SC can only update cohorts in their own org
    if (user.role === 'SC' && cohort.organizationId !== user.organizationId) {
      throw ForbiddenError();
    }

    log.info('Updating cohort settings', {
      cohortId,
      code: cohort.code,
      actorId: user.id,
    });

    try {
      const result = await updateSettings(cohortId, rawBody, user.id);
      return ApiResponse.success(result);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('COHORT_SETTINGS_INVALID:')) {
        const parts = err.message.split(':');
        throw BadRequestError(`Validasi settings gagal: field '${parts[1]}' — ${parts[2]}`);
      }
      throw err;
    }
  },
});

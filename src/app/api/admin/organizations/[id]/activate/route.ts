/**
 * POST /api/admin/organizations/[id]/activate
 * Activate an organization: PENDING → ACTIVE (SUPERADMIN only).
 *
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { createApiHandler, ApiResponse, validateParams, idParamSchema, BadRequestError } from '@/lib/api';
import { activateOrganization } from '@/services/organization.service';

export const POST = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (_req, { user, params, log }) => {
    const { id } = validateParams(params, idParamSchema);

    log.info('Activating organization', { orgId: id, actorId: user.id });

    try {
      const org = await activateOrganization(id, user.id);
      return ApiResponse.success({
        activated: true,
        orgId: org.id,
        registrationStatus: org.registrationStatus,
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'ORG_NOT_FOUND') {
          throw BadRequestError('Organisasi tidak ditemukan');
        }
        if (err.message.startsWith('ORG_INVALID_TRANSITION:')) {
          throw BadRequestError(
            `Tidak dapat mengaktifkan: status saat ini bukan PENDING`,
          );
        }
      }
      throw err;
    }
  },
});

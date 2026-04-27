/**
 * POST /api/admin/organizations/[id]/suspend
 * Suspend an organization: ACTIVE → SUSPENDED (SUPERADMIN only).
 * Requires mandatory reason.
 * Side effect: bulk sessionEpoch++ for all org users.
 *
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { suspendOrganization } from '@/services/organization.service';

const suspendBodySchema = z.object({
  reason: z.string().min(10, 'Alasan suspensi minimal 10 karakter'),
});

export const POST = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id } = validateParams(params, idParamSchema);
    const { reason } = await validateBody(req, suspendBodySchema);

    log.info('Suspending organization', { orgId: id, actorId: user.id });

    try {
      const org = await suspendOrganization(id, reason, user.id);
      return ApiResponse.success({
        suspended: true,
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
            `Tidak dapat mensuspen: status saat ini bukan ACTIVE`,
          );
        }
      }
      throw err;
    }
  },
});

/**
 * GET /api/event/instances/[id]/nps-aggregate
 * NPS aggregate for OC/SC. Returns null envelope if n < 5 responses.
 * Never returns individual scores or comments.
 */

import { createApiHandler, ApiResponse, validateParams, ForbiddenError } from '@/lib/api';
import { getNPSAggregate } from '@/lib/event/services/nps.service';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    // Only OC, SC, SUPERADMIN can view aggregate
    if (!['OC', 'SC', 'SUPERADMIN'].includes(user.role)) {
      throw ForbiddenError();
    }

    const { id: instanceId } = validateParams(params, paramsSchema);
    log.info('Fetching NPS aggregate', { instanceId, role: user.role });

    // Get organizationId from instance for scoped cache key
    const instance = await prisma.kegiatanInstance.findUnique({
      where: { id: instanceId },
      select: { organizationId: true },
    });

    if (!instance) {
      return ApiResponse.success(null);
    }

    const aggregate = await getNPSAggregate(instanceId, instance.organizationId);
    return ApiResponse.success(aggregate);
  },
});

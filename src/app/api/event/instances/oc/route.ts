/**
 * GET /api/event/instances/oc
 * OC hub — full instance list for the organization.
 * Roles: OC, SC, SUPERADMIN.
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { getInstanceListOC } from '@/lib/event/services/instance.service';
import { prisma } from '@/utils/prisma';

export const GET = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (_req, { user, log }) => {
    // Get user's organizationId
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });

    if (!dbUser?.organizationId) {
      return ApiResponse.success([]);
    }

    log.info('OC fetching instance list', { userId: user.id, organizationId: dbUser.organizationId });

    const instances = await getInstanceListOC(dbUser.organizationId);
    return ApiResponse.success(instances);
  },
});

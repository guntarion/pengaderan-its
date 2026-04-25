/**
 * src/app/api/event-execution/instances/[id]/cancellation-status/route.ts
 * NAWASENA M08 — Poll cancellation progress.
 *
 * GET /api/event-execution/instances/[id]/cancellation-status
 *   - Returns cancellation status + notificationFailedCount
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { prisma } from '@/utils/prisma';

export const GET = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params }) => {
    const instanceId = (params as { id: string }).id;

    const instance = await prisma.kegiatanInstance.findFirst({
      where: { id: instanceId, organizationId: user.organizationId! },
      select: {
        id: true,
        status: true,
        cancelledAt: true,
        cancellationReason: true,
        notificationFailedCount: true,
      },
    });

    if (!instance) {
      throw new Error('NOT_FOUND: Instance tidak ditemukan.');
    }

    return ApiResponse.success(instance);
  },
});

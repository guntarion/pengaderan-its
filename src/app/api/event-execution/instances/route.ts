/**
 * src/app/api/event-execution/instances/route.ts
 * NAWASENA M08 — Create KegiatanInstance from Kegiatan master.
 *
 * POST /api/event-execution/instances
 *   - Roles: OC, SC, SUPERADMIN
 *   - Creates instance with status=PLANNED
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { createInstanceSchema } from '@/lib/event-execution/schemas';
import { createInstanceFromMaster } from '@/lib/event-execution/services/instance.service';
import { prisma } from '@/utils/prisma';

export const POST = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const input = await validateBody(req, createInstanceSchema);

    // Resolve cohortId from user's currentCohortId if not provided
    const cohortId = input.cohortId ?? null;
    if (!cohortId) {
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { currentCohortId: true, organizationId: true },
      });
      if (!userData?.currentCohortId) {
        throw new Error('BAD_REQUEST: User tidak tergabung dalam cohort aktif.');
      }
      const result = await createInstanceFromMaster(
        input,
        user.id,
        user.organizationId ?? userData.organizationId,
        userData.currentCohortId,
      );
      log.info('Instance created via API', { instanceId: result.instance.id });
      return ApiResponse.success(result.instance, 201);
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });

    const result = await createInstanceFromMaster(
      input,
      user.id,
      user.organizationId ?? userData?.organizationId ?? '',
      cohortId,
    );
    log.info('Instance created via API', { instanceId: result.instance.id });
    return ApiResponse.success(result.instance, 201);
  },
});

export const GET = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (_req, { user, log }) => {
    const { getOCInstanceListing } = await import('@/lib/event-execution/services/instance.service');
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true, currentCohortId: true },
    });
    if (!userData?.currentCohortId) {
      return ApiResponse.success([]);
    }
    const instances = await getOCInstanceListing(
      userData.currentCohortId,
      userData.organizationId,
      user.id,
    );
    log.info('OC instance listing fetched', { count: instances.length });
    return ApiResponse.success(instances);
  },
});

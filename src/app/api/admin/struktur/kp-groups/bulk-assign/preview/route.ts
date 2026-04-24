/**
 * POST /api/admin/struktur/kp-groups/bulk-assign/preview
 * Preview bulk KP Group assignment before commit.
 *
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { bulkAssignPreviewSchema } from '@/lib/schemas/kp-group';
import { assignMabasToKPGroups } from '@/lib/pairing/kp-group-assignment';
import { createPreviewToken } from '@/lib/preview-cache';
import type { KPAssignInput, KPGroupDescriptor } from '@/lib/pairing/types';

export const POST = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const data = await validateBody(req, bulkAssignPreviewSchema);
    const user = ctx.user as { id: string };

    ctx.log.info('Generating KP Group bulk assign preview', {
      cohortId: data.cohortId,
      mode: data.mode,
    });

    // Get all unassigned MABA in this cohort
    const cohort = await prisma.cohort.findUnique({
      where: { id: data.cohortId },
      select: { id: true, organizationId: true },
    });
    if (!cohort) throw BadRequestError('Cohort tidak ditemukan');

    const mabas = await prisma.user.findMany({
      where: {
        currentCohortId: data.cohortId,
        role: 'MABA',
        status: 'ACTIVE',
        // Exclude already-assigned MABA (active KPGroupMember)
        kpGroupMemberships: {
          none: { cohortId: data.cohortId, status: 'ACTIVE' },
        },
      },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        nrp: true,
        isRantau: true,
        isKIP: true,
      },
      orderBy: { fullName: 'asc' },
    });

    if (mabas.length === 0) {
      throw BadRequestError('Tidak ada MABA yang belum di-assign ke KP Group');
    }

    // Get all DRAFT/ACTIVE KP Groups for this cohort
    const groups = await prisma.kPGroup.findMany({
      where: { cohortId: data.cohortId, status: { in: ['DRAFT', 'ACTIVE'] } },
      select: { id: true, code: true, capacityTarget: true, capacityMax: true },
      orderBy: { code: 'asc' },
    });

    if (groups.length === 0) {
      throw BadRequestError('Tidak ada KP Group yang tersedia untuk cohort ini');
    }

    const mabaInputs: KPAssignInput[] = mabas.map((m) => ({
      userId: m.id,
      isRantau: m.isRantau ?? false,
      isKIP: m.isKIP ?? false,
      displayName: m.displayName ?? m.fullName,
      nrp: m.nrp,
    }));

    const groupDescriptors: KPGroupDescriptor[] = groups.map((g) => ({
      id: g.id,
      code: g.code,
      capacityTarget: g.capacityTarget,
      capacityMax: g.capacityMax,
    }));

    const result = assignMabasToKPGroups(mabaInputs, groupDescriptors, {
      mode: data.mode,
      seed: data.seed,
    });

    // Store preview in cache
    const previewToken = await createPreviewToken({
      cohortId: data.cohortId,
      organizationId: cohort.organizationId,
      actorUserId: user.id,
      mode: data.mode,
      seed: data.seed,
      assignments: result.assignments,
      metadata: result.metadata,
    });

    ctx.log.info('Bulk assign preview generated', {
      mabaCount: mabas.length,
      groupCount: groups.length,
      previewToken: previewToken.slice(0, 8) + '...',
    });

    return ApiResponse.success({
      previewToken,
      assignments: result.assignments,
      groupStats: result.groupStats,
      metadata: result.metadata,
    });
  },
});

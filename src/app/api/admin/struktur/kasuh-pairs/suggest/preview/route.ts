/**
 * POST /api/admin/struktur/kasuh-pairs/suggest/preview
 * Generate Kasuh matchmaking suggestions (Top-3 per unassigned MABA).
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { kasuhSuggestPreviewSchema } from '@/lib/schemas/kp-group';
import { suggestKasuhForMaba } from '@/lib/pairing/kasuh-matchmaking';
import { createPreviewToken } from '@/lib/preview-cache';
import type { MabaInput, KasuhInput } from '@/lib/pairing/types';

export const POST = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const data = await validateBody(req, kasuhSuggestPreviewSchema);
    const user = ctx.user as { id: string };

    ctx.log.info('Generating Kasuh matchmaking suggestions', { cohortId: data.cohortId });

    const cohort = await prisma.cohort.findUnique({
      where: { id: data.cohortId },
      select: { id: true, organizationId: true },
    });
    if (!cohort) throw BadRequestError('Cohort tidak ditemukan');

    // Get unassigned MABAs
    const mabas = await prisma.user.findMany({
      where: {
        currentCohortId: data.cohortId,
        role: 'MABA',
        status: 'ACTIVE',
        kasuhPairsAsMaba: { none: { cohortId: data.cohortId, status: 'ACTIVE' } },
      },
      select: {
        id: true,
        interests: true,
        province: true,
      },
      orderBy: { id: 'asc' },
    });

    if (mabas.length === 0) {
      throw BadRequestError('Semua MABA sudah di-assign ke Kasuh');
    }

    // Get eligible Kasuh (count active assignments for capacity check)
    const kasuhs = await prisma.user.findMany({
      where: {
        currentCohortId: data.cohortId,
        role: 'KASUH',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        interests: true,
        province: true,
        _count: { select: { kasuhPairsAsKasuh: { where: { cohortId: data.cohortId, status: 'ACTIVE' } } } },
      },
    });

    const mabaInputs: MabaInput[] = mabas.map((m) => ({
      userId: m.id,
      interests: Array.isArray(m.interests) ? (m.interests as string[]) : [],
      province: m.province,
      prodi: null, // prodi field not yet on User model — use null
      cohortId: data.cohortId,
    }));

    const kasuhInputs: KasuhInput[] = kasuhs.map((k) => ({
      userId: k.id,
      interests: Array.isArray(k.interests) ? (k.interests as string[]) : [],
      province: k.province,
      prodi: null,
      currentAssignmentCount: k._count.kasuhPairsAsKasuh,
      status: 'ACTIVE',
    }));

    const suggestions = suggestKasuhForMaba(mabaInputs, kasuhInputs);

    const previewToken = await createPreviewToken({
      cohortId: data.cohortId,
      organizationId: cohort.organizationId,
      actorUserId: user.id,
      suggestions,
    });

    ctx.log.info('Kasuh suggestions generated', {
      mabaCount: mabas.length,
      kasuhCount: kasuhs.length,
    });

    return ApiResponse.success({
      previewToken,
      suggestions,
    });
  },
});

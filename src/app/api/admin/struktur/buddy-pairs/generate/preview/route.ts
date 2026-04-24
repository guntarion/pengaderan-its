/**
 * POST /api/admin/struktur/buddy-pairs/generate/preview
 * Generate buddy pair preview using seeded algorithm.
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { generateBuddyPreviewSchema } from '@/lib/schemas/kp-group';
import { generateBuddyPairs } from '@/lib/pairing/buddy-algorithm';
import { createPreviewToken } from '@/lib/preview-cache';
import type { BuddyInput } from '@/lib/pairing/types';

export const POST = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const data = await validateBody(req, generateBuddyPreviewSchema);
    const user = ctx.user as { id: string };

    ctx.log.info('Generating Buddy Pair preview', {
      cohortId: data.cohortId,
      seed: data.seed,
      oddStrategy: data.oddStrategy,
    });

    const cohort = await prisma.cohort.findUnique({
      where: { id: data.cohortId },
      select: { id: true, organizationId: true },
    });
    if (!cohort) throw BadRequestError('Cohort tidak ditemukan');

    // Get unassigned MABAs (no active BuddyPairMember for this cohort)
    const mabas = await prisma.user.findMany({
      where: {
        currentCohortId: data.cohortId,
        role: 'MABA',
        status: 'ACTIVE',
        buddyPairMemberships: {
          none: { cohortId: data.cohortId, status: 'ACTIVE' },
        },
      },
      select: { id: true, isRantau: true, isKIP: true },
      orderBy: { id: 'asc' },
    });

    if (mabas.length === 0) {
      throw BadRequestError('Tidak ada MABA yang belum di-assign ke Buddy Pair');
    }

    const buddyInputs: BuddyInput[] = mabas.map((m) => ({
      userId: m.id,
      isRantau: m.isRantau ?? false,
      isKIP: m.isKIP ?? false,
      cohortId: data.cohortId,
    }));

    const result = generateBuddyPairs(buddyInputs, {
      seed: data.seed ?? Date.now().toString(36),
      algorithmVersion: 'v1.0-greedy-swap',
      oddStrategy: data.oddStrategy,
    });

    const previewToken = await createPreviewToken({
      cohortId: data.cohortId,
      organizationId: cohort.organizationId,
      actorUserId: user.id,
      pairs: result.pairs,
      metadata: result.metadata,
    });

    ctx.log.info('Buddy Pair preview generated', {
      pairCount: result.pairs.length,
      crossRatio: result.metadata.crossRatio,
    });

    return ApiResponse.success({
      previewToken,
      pairs: result.pairs,
      metadata: result.metadata,
    });
  },
});

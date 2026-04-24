/**
 * src/app/api/time-capsule/draft/route.ts
 * NAWASENA M07 — Time Capsule draft upsert.
 *
 * PUT /api/time-capsule/draft — upsert draft (publishedAt = null)
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { upsertDraft } from '@/lib/time-capsule/service';
import { z } from 'zod';

const draftSchema = z.object({
  title: z.string().max(120).optional(),
  body: z.string().max(10000).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  sharedWithKasuh: z.boolean().optional(),
});

// ── PUT /api/time-capsule/draft ──────────────────────────────────────────

export const PUT = createApiHandler({
  auth: true,
  handler: async (req, { user, log: ctx }) => {
    const data = await validateBody(req, draftSchema);

    ctx.debug('Upserting Time Capsule draft', { userId: user.id });

    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true, currentCohortId: true },
    });

    if (!userRecord?.currentCohortId) {
      return ApiResponse.success({ draft: null, message: 'No active cohort' });
    }

    const draft = await upsertDraft(
      user.id,
      userRecord.currentCohortId,
      userRecord.organizationId,
      data,
    );

    return ApiResponse.success({ draft, savedAt: new Date() });
  },
});

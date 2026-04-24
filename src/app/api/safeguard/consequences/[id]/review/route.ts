/**
 * src/app/api/safeguard/consequences/[id]/review/route.ts
 * NAWASENA M10 — SC/SG-Officer reviews consequence submission.
 *
 * POST /api/safeguard/consequences/[id]/review
 * Roles: SC, isSafeguardOfficer
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema } from '@/lib/api';
import { z } from 'zod';
import { reviewCompletion } from '@/lib/safeguard/consequences/review';
import type { IncidentActor } from '@/lib/safeguard/types';

const reviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reviewNote: z.string().optional(),
});

export const POST = createApiHandler({
  roles: ['SC'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);
    const body = await validateBody(req, reviewSchema);

    const rawUser = ctx.user as unknown as {
      id: string;
      role: string;
      organizationId?: string;
      isSafeguardOfficer?: boolean;
    };

    const reviewer: IncidentActor = {
      id: rawUser.id,
      role: rawUser.role as IncidentActor['role'],
      isSafeguardOfficer: rawUser.isSafeguardOfficer ?? false,
      organizationId: rawUser.organizationId ?? '',
    };

    ctx.log.info('Reviewing consequence', { consequenceId: id, reviewerId: reviewer.id, decision: body.decision });

    const updated = await reviewCompletion(id, reviewer, body.decision, body.reviewNote, {
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    return ApiResponse.success(updated);
  },
});

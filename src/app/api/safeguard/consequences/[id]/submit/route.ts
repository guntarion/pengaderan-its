/**
 * src/app/api/safeguard/consequences/[id]/submit/route.ts
 * NAWASENA M10 — Maba submits consequence completion.
 *
 * POST /api/safeguard/consequences/[id]/submit
 * Role: authenticated user (must be consequence target)
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema } from '@/lib/api';
import { z } from 'zod';
import { submitCompletion } from '@/lib/safeguard/consequences/submit';

const submitSchema = z.object({
  notesAfter: z.string().optional(),
  attachmentKey: z.string().optional(),
});

export const POST = createApiHandler({
  auth: true,
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);
    const body = await validateBody(req, submitSchema);

    const rawUser = ctx.user as unknown as { id: string };

    ctx.log.info('Maba submitting consequence', { consequenceId: id, mabaId: rawUser.id });

    const updated = await submitCompletion(id, rawUser.id, body, {
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    return ApiResponse.success(updated);
  },
});

/**
 * POST /api/safeguard/incidents/[id]/attachments/confirm
 * NAWASENA M10 — Confirm a completed attachment upload.
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema } from '@/lib/api';
import { z } from 'zod';
import { confirmUpload } from '@/lib/safeguard/attachments';
import type { IncidentActor } from '@/lib/safeguard/types';

const confirmSchema = z.object({
  s3Key: z.string().min(1),
});

export const POST = createApiHandler({
  roles: ['KP', 'OC', 'SC'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);
    const body = await validateBody(req, confirmSchema);

    const rawUser = ctx.user as unknown as {
      id: string;
      role: string;
      organizationId?: string;
      isSafeguardOfficer?: boolean;
    };

    const actor: IncidentActor = {
      id: rawUser.id,
      role: rawUser.role as IncidentActor['role'],
      isSafeguardOfficer: rawUser.isSafeguardOfficer ?? false,
      organizationId: rawUser.organizationId ?? '',
    };

    ctx.log.info('Confirming attachment upload', { incidentId: id, s3Key: body.s3Key });

    await confirmUpload(id, body.s3Key, actor, {
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    return ApiResponse.success({ confirmed: true, s3Key: body.s3Key });
  },
});

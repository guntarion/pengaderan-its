/**
 * POST /api/safeguard/incidents/[id]/attachments/presign
 * NAWASENA M10 — Request a presigned PUT URL for incident attachment upload.
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema } from '@/lib/api';
import { z } from 'zod';
import { presignUpload } from '@/lib/safeguard/attachments';

const presignSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export const POST = createApiHandler({
  roles: ['KP', 'OC', 'SC'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);
    const body = await validateBody(req, presignSchema);

    const rawUser = ctx.user as unknown as { id: string; organizationId?: string };

    ctx.log.info('Presigning attachment upload', { incidentId: id, mimeType: body.mimeType });

    const result = await presignUpload(id, rawUser.id, rawUser.organizationId ?? '', body);

    return ApiResponse.success(result);
  },
});

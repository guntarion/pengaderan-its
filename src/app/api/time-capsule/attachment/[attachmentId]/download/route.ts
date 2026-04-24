/**
 * src/app/api/time-capsule/attachment/[attachmentId]/download/route.ts
 * NAWASENA M07 — Issue presigned GET URL for downloading an attachment.
 *
 * GET /api/time-capsule/attachment/:attachmentId/download
 * Auth required. Double gate: owner or active Kasuh with share access.
 * Returns { url } — presigned URL valid for 1 hour (not logged).
 */

import { createApiHandler, ApiResponse, validateParams } from '@/lib/api';
import { issueDownloadUrl } from '@/lib/time-capsule/attachment-service';
import { z } from 'zod';

const paramsSchema = z.object({
  attachmentId: z.string().cuid(),
});

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log: ctx }) => {
    const { attachmentId } = validateParams(params, paramsSchema);

    ctx.info('Issuing attachment download URL', { attachmentId, userId: user.id });

    const url = await issueDownloadUrl(attachmentId, {
      id: user.id,
      role: user.role,
    });

    ctx.info('Download URL issued', { attachmentId, userId: user.id });

    return ApiResponse.success({ url });
  },
});

/**
 * GET /api/safeguard/incidents/[id]/attachments/[key]
 * NAWASENA M10 — Get presigned download URL for incident attachment.
 *
 * Note: [key] in URL is the URL-encoded base64 of the S3 key.
 */

import { createApiHandler, ApiResponse, validateParams, NotFoundError } from '@/lib/api';
import { z } from 'zod';
import { presignDownload } from '@/lib/safeguard/attachments';
import type { IncidentActor } from '@/lib/safeguard/types';

const paramsSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
});

export const GET = createApiHandler({
  roles: ['SC', 'KP', 'OC', 'PEMBINA'],
  handler: async (req, ctx) => {
    const { id, key } = validateParams(ctx.params, paramsSchema);

    // The key may be URL-encoded
    const s3Key = decodeURIComponent(key);
    if (!s3Key) throw NotFoundError('Attachment');

    const rawUser = ctx.user as unknown as {
      id: string;
      role: string;
      organizationId?: string;
      isSafeguardOfficer?: boolean;
    };

    const viewer: IncidentActor = {
      id: rawUser.id,
      role: rawUser.role as IncidentActor['role'],
      isSafeguardOfficer: rawUser.isSafeguardOfficer ?? false,
      organizationId: rawUser.organizationId ?? '',
    };

    ctx.log.info('Requesting attachment download', { incidentId: id, s3Key, viewerId: viewer.id });

    const result = await presignDownload(id, s3Key, viewer, {
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    return ApiResponse.success(result);
  },
});

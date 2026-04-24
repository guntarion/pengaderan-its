/**
 * src/app/api/time-capsule/upload-url/route.ts
 * NAWASENA M07 — Issue presigned S3 PUT URL for Time Capsule attachments.
 *
 * POST /api/time-capsule/upload-url
 * Auth required. Validates MIME, size, attachment count.
 * Returns { uploadUrl, storageKey, expiresAt }.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { issueUploadUrl } from '@/lib/time-capsule/attachment-service';
import { z } from 'zod';

const bodySchema = z.object({
  entryId: z.string().cuid().optional(),
  filename: z.string().min(1).max(255),
  mime: z.string().min(1).max(128),
  size: z.number().int().positive(),
});

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log: ctx }) => {
    const data = await validateBody(req, bodySchema);

    ctx.info('Issuing attachment upload URL', {
      userId: user.id,
      entryId: data.entryId,
      mime: data.mime,
      size: data.size,
    });

    // Get user's org + cohort
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true, currentCohortId: true },
    });

    if (!userRecord?.currentCohortId) {
      throw new Error('User tidak terdaftar dalam cohort aktif');
    }

    const result = await issueUploadUrl({
      userId: user.id,
      cohortId: userRecord.currentCohortId,
      orgId: userRecord.organizationId,
      entryId: data.entryId,
      filename: data.filename,
      mime: data.mime,
      size: data.size,
    });

    ctx.info('Upload URL issued successfully', {
      userId: user.id,
      storageKey: result.storageKey,
    });

    return ApiResponse.success({
      uploadUrl: result.uploadUrl,
      storageKey: result.storageKey,
      expiresAt: result.expiresAt,
    });
  },
});

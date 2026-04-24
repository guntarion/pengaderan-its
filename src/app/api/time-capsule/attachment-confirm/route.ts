/**
 * src/app/api/time-capsule/attachment-confirm/route.ts
 * NAWASENA M07 — Confirm S3 upload and create attachment DB record.
 *
 * POST /api/time-capsule/attachment-confirm
 * Auth required. Verifies file exists in S3 via HEAD, creates row.
 * Returns the created TimeCapsuleAttachment.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { confirmUpload } from '@/lib/time-capsule/attachment-service';
import { auditLog } from '@/services/audit-log.service';
import { z } from 'zod';

const bodySchema = z.object({
  entryId: z.string().cuid().optional(),
  storageKey: z.string().min(1).max(500),
  mime: z.string().min(1).max(128),
  size: z.number().int().positive(),
  originalFilename: z.string().min(1).max(255),
});

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log: ctx }) => {
    const data = await validateBody(req, bodySchema);

    ctx.info('Confirming attachment upload', {
      userId: user.id,
      entryId: data.entryId,
      storageKey: data.storageKey,
    });

    // Get user's org + cohort
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true, currentCohortId: true },
    });

    if (!userRecord?.currentCohortId) {
      throw new Error('User tidak terdaftar dalam cohort aktif');
    }

    const attachment = await confirmUpload({
      userId: user.id,
      orgId: userRecord.organizationId,
      cohortId: userRecord.currentCohortId,
      entryId: data.entryId,
      storageKey: data.storageKey,
      mime: data.mime,
      size: data.size,
      originalFilename: data.originalFilename,
    });

    // Audit log
    await auditLog.record({
      userId: user.id,
      action: 'TIME_CAPSULE_ATTACHMENT_UPLOAD' as Parameters<typeof auditLog.record>[0]['action'],
      resource: 'TimeCapsuleAttachment',
      resourceId: attachment.id,
      newValue: {
        entryId: data.entryId ?? null,
        storageKey: data.storageKey,
        mimeType: data.mime,
        size: data.size,
      },
      request: req,
    });

    ctx.info('Attachment confirmed', {
      attachmentId: attachment.id,
      userId: user.id,
    });

    return ApiResponse.success(attachment, 201);
  },
});

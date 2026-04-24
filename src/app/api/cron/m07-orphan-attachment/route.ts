/**
 * src/app/api/cron/m07-orphan-attachment/route.ts
 * NAWASENA M07 — Cleanup orphan Time Capsule attachments.
 *
 * Schedule (UTC): 30 4 * * * (11:30 WIB daily)
 * Deletes attachments where entryId IS NULL and uploadedAt < 7 days ago.
 * Performs batch S3 object deletion + row deletion with audit log.
 *
 * Supports ?dryRun=true to preview without deleting.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { getS3Client, getSpacesBucket } from '@/lib/storage/s3-client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AuditAction } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const log = createLogger('cron:m07-orphan-attachment');

const querySchema = z.object({
  dryRun: z.enum(['true', 'false']).optional().default('true'),
});

const BATCH_SIZE = 50;
const ORPHAN_AGE_DAYS = 7;

export const GET = createApiHandler({
  auth: false,
  handler: async (req, { log: ctx }) => {
    verifyCronAuth(req);

    const { dryRun: dryRunStr } = validateQuery(req, querySchema);
    const dryRun = dryRunStr === 'true';

    ctx.info('M07 orphan attachment cleanup started', { dryRun });

    const cutoff = new Date(Date.now() - ORPHAN_AGE_DAYS * 24 * 60 * 60 * 1000);

    // Find orphan attachments (no entryId, uploaded > 7 days ago)
    const orphans = await prisma.timeCapsuleAttachment.findMany({
      where: {
        entryId: null,
        uploadedAt: { lt: cutoff },
      },
      select: {
        id: true,
        storageKey: true,
        userId: true,
      },
      take: BATCH_SIZE,
    });

    ctx.info('Found orphan attachments', { count: orphans.length, dryRun, cutoff });

    if (dryRun || orphans.length === 0) {
      return ApiResponse.success({
        dryRun,
        found: orphans.length,
        deleted: 0,
        message: dryRun
          ? `Dry-run: would delete ${orphans.length} orphan attachment(s)`
          : 'No orphan attachments found',
      });
    }

    const s3 = getS3Client();
    const bucket = getSpacesBucket();

    let deletedCount = 0;
    const errors: string[] = [];

    // Delete S3 objects + DB rows
    for (const orphan of orphans) {
      try {
        // Delete from S3
        await s3.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: orphan.storageKey }),
        );
        log.info('Deleted S3 object', { storageKey: orphan.storageKey });

        // Delete DB row
        await prisma.timeCapsuleAttachment.delete({ where: { id: orphan.id } });

        // Audit log
        await prisma.nawasenaAuditLog.create({
          data: {
            actorUserId: orphan.userId,
            action: AuditAction.TIME_CAPSULE_ATTACHMENT_DELETE,
            entityType: 'TimeCapsuleAttachment',
            entityId: orphan.id,
            beforeValue: { storageKey: orphan.storageKey, reason: 'orphan_cleanup' },
          },
        });

        deletedCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('Failed to delete orphan attachment', { id: orphan.id, error: msg });
        errors.push(`${orphan.id}: ${msg}`);
      }
    }

    ctx.info('M07 orphan attachment cleanup complete', {
      found: orphans.length,
      deleted: deletedCount,
      errors: errors.length,
    });

    return ApiResponse.success({
      dryRun: false,
      found: orphans.length,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  },
});

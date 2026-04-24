/**
 * src/app/api/anon-reports/[id]/attachment/route.ts
 * GET /api/anon-reports/[id]/attachment
 *
 * Generate a signed S3 URL for downloading an attachment.
 * TTL: 15 minutes.
 * Returns DOWNLOAD_ATTACHMENT audit entry in same transaction.
 *
 * MANDATORY: recordAnonAccess must be imported and called.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateParams, idParamSchema, NotFoundError } from '@/lib/api';
import { setAnonSessionVars } from '@/lib/anon-report/rls-helpers';
import { recordAnonAccess } from '@/lib/anon-report/access-log'; // MANDATORY — do not remove
import { AnonAccessAction } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import { issueGetUrl } from '@/lib/storage/presigned-download';

const log = createLogger('anon-attachment');

export const GET = createApiHandler({
  roles: ['BLM', 'SATGAS_PPKPT', 'SUPERADMIN'],
  handler: async (_req, { user, params }) => {
    const { id } = validateParams(params, idParamSchema);

    log.info('Attachment download requested', { role: user.role });

    const { signedUrl, attachmentKey } = await prisma.$transaction(async (tx) => {
      await setAnonSessionVars(tx, user);

      const report = await tx.anonReport.findUnique({
        where: { id },
        select: { id: true, attachmentKey: true },
      });

      if (!report) throw NotFoundError('Laporan');
      if (!report.attachmentKey) throw NotFoundError('Lampiran');

      // Generate signed URL (TTL 15 min = 900s)
      const url = await issueGetUrl({ key: report.attachmentKey, ttlSeconds: 900 });

      // Mandatory audit entry with key meta
      await recordAnonAccess(tx, user, id, AnonAccessAction.DOWNLOAD_ATTACHMENT, {
        attachmentKey: '[REDACTED]', // Never log the actual key in audit meta
        downloadedAt: new Date().toISOString(),
      });

      return { signedUrl: url, attachmentKey: report.attachmentKey };
    });

    void attachmentKey; // used in transaction scope, not returned to client

    return ApiResponse.success({ signedUrl, expiresIn: 900 });
  },
});

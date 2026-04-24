/**
 * src/app/api/anon-reports/superadmin/bulk-delete/route.ts
 * POST /api/anon-reports/superadmin/bulk-delete
 *
 * SUPERADMIN-only soft delete (redact) of spam/invalid reports.
 * Requires mandatory reason. Creates BULK_DELETE audit entry per report.
 *
 * Note: This is a soft delete — bodyText is redacted, bodyRedacted=true.
 * Actual DB row deletion requires database admin access (by design).
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { setBypassRls } from '@/lib/anon-report/rls-helpers';
import { recordAnonAccess } from '@/lib/anon-report/access-log';
import { bulkDeleteSchema } from '@/lib/anon-report/schemas';
import { AnonAccessAction } from '@prisma/client';

export const POST = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, bulkDeleteSchema);

    log.info('Bulk delete requested', {
      count: body.reportIds.length,
      role: user.role,
    });

    const results = await prisma.$transaction(async (tx) => {
      await setBypassRls(tx);

      const processed: string[] = [];
      const failed: string[] = [];

      for (const reportId of body.reportIds) {
        try {
          // Check report exists
          const existing = await tx.anonReport.findUnique({
            where: { id: reportId },
            select: { id: true },
          });

          if (!existing) {
            failed.push(reportId);
            continue;
          }

          // Soft delete — redact body
          await tx.anonReport.update({
            where: { id: reportId },
            data: {
              bodyText: '[REDACTED - spam/invalid by SUPERADMIN]',
              bodyRedacted: true,
              attachmentKey: null,
            },
          });

          // Audit per report
          await recordAnonAccess(tx, user, reportId, AnonAccessAction.BULK_DELETE, {
            reason: body.reason,
          });

          processed.push(reportId);
        } catch {
          failed.push(reportId);
        }
      }

      return { processed, failed };
    });

    log.info('Bulk delete completed', {
      processed: results.processed.length,
      failed: results.failed.length,
    });

    return ApiResponse.success({
      processed: results.processed.length,
      failed: results.failed.length,
      failedIds: results.failed,
    });
  },
});

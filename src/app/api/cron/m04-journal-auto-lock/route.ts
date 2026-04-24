/**
 * src/app/api/cron/m04-journal-auto-lock/route.ts
 * NAWASENA M04 — Journal auto-lock cron (runs Wednesdays).
 *
 * Schedule (UTC): 0 0 * * 3 (Wednesday 07:00 WIB)
 * Finds orphan JournalDrafts from past weeks and deletes them.
 * Journals already submitted are not affected.
 * Audits each batch with AuditAction.JOURNAL_AUTO_LOCK_MISSED.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { AuditAction } from '@prisma/client';

export const GET = createApiHandler({
  auth: false,
  handler: async (req, { log }) => {
    verifyCronAuth(req);

    log.info('M04 journal auto-lock cron started');

    // Determine the current week in each active cohort.
    // We lock drafts that are more than 1 week behind the cohort's current week.
    // Strategy: delete any JournalDraft for cohorts where the draft week is
    // from a cohort start date meaning the window has already closed.
    //
    // Simplified approach: delete drafts updated more than 7 days ago
    // (i.e., the Maba missed the submission window).
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find candidate drafts
    const candidateDrafts = await prisma.journalDraft.findMany({
      where: {
        updatedAt: { lt: sevenDaysAgo },
      },
      select: {
        id: true,
        userId: true,
        cohortId: true,
        weekNumber: true,
        organizationId: true,
      },
    });

    log.info('Auto-lock: found orphan drafts', { count: candidateDrafts.length });

    if (candidateDrafts.length > 0) {
      // Delete orphan drafts
      const deleteResult = await prisma.journalDraft.deleteMany({
        where: {
          updatedAt: { lt: sevenDaysAgo },
        },
      });

      // Audit log
      await prisma.nawasenaAuditLog.create({
        data: {
          action: AuditAction.JOURNAL_AUTO_LOCK_MISSED,
          entityType: 'JournalDraft',
          entityId: 'cron-batch',
          metadata: {
            deletedCount: deleteResult.count,
            cutoffDate: sevenDaysAgo.toISOString(),
            affectedUsers: candidateDrafts.map((d) => ({
              userId: d.userId,
              cohortId: d.cohortId,
              weekNumber: d.weekNumber,
            })),
          },
        },
      });

      log.info('Auto-lock: orphan drafts deleted', { count: deleteResult.count });

      return ApiResponse.success({ locked: deleteResult.count });
    }

    log.info('Auto-lock: no orphan drafts found');
    return ApiResponse.success({ locked: 0 });
  },
});

/**
 * src/app/api/cron/m04-retention-purge/route.ts
 * NAWASENA M04 — Data retention purge cron.
 *
 * Schedule (UTC): 0 3 * * * (10:00 WIB daily)
 * Deletes:
 *   - PulseCheck older than 1 year
 *   - Journal older than 2 years
 *   - JournalDraft older than 6 months
 *
 * Supports ?dryRun=true to preview without deleting.
 * Audits each deletion batch with AuditAction.DATA_RETENTION_PURGE.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { AuditAction } from '@prisma/client';
import { z } from 'zod';

const querySchema = z.object({
  dryRun: z.enum(['true', 'false']).optional().default('false'),
});

export const GET = createApiHandler({
  auth: false,
  handler: async (req, { log }) => {
    verifyCronAuth(req);

    const { dryRun: dryRunStr } = validateQuery(req, querySchema);
    const dryRun = dryRunStr === 'true';

    log.info('M04 retention purge cron started', { dryRun });

    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

    let deletedPulseChecks = 0;
    let deletedJournals = 0;
    let deletedDrafts = 0;

    if (dryRun) {
      // Count only — no deletion
      [deletedPulseChecks, deletedJournals, deletedDrafts] = await Promise.all([
        prisma.pulseCheck.count({ where: { recordedAt: { lt: oneYearAgo } } }),
        prisma.journal.count({ where: { submittedAt: { lt: twoYearsAgo } } }),
        prisma.journalDraft.count({ where: { updatedAt: { lt: sixMonthsAgo } } }),
      ]);

      log.info('M04 retention purge dry-run complete', {
        wouldDelete: { pulseChecks: deletedPulseChecks, journals: deletedJournals, drafts: deletedDrafts },
      });
    } else {
      // Perform actual deletions in parallel
      const [pulseResult, journalResult, draftResult] = await Promise.all([
        prisma.pulseCheck.deleteMany({ where: { recordedAt: { lt: oneYearAgo } } }),
        prisma.journal.deleteMany({ where: { submittedAt: { lt: twoYearsAgo } } }),
        prisma.journalDraft.deleteMany({ where: { updatedAt: { lt: sixMonthsAgo } } }),
      ]);

      deletedPulseChecks = pulseResult.count;
      deletedJournals = journalResult.count;
      deletedDrafts = draftResult.count;

      // Audit log
      await prisma.nawasenaAuditLog.create({
        data: {
          action: AuditAction.DATA_RETENTION_PURGE,
          entityType: 'M04DataRetention',
          entityId: 'cron',
          metadata: {
            deletedPulseChecks,
            deletedJournals,
            deletedDrafts,
            cutoffs: {
              pulseChecks: oneYearAgo.toISOString(),
              journals: twoYearsAgo.toISOString(),
              drafts: sixMonthsAgo.toISOString(),
            },
          },
        },
      });

      log.info('M04 retention purge complete', {
        deleted: { pulseChecks: deletedPulseChecks, journals: deletedJournals, drafts: deletedDrafts },
      });
    }

    return ApiResponse.success({
      deleted: {
        pulseChecks: deletedPulseChecks,
        journals: deletedJournals,
        drafts: deletedDrafts,
      },
      dryRun,
    });
  },
});

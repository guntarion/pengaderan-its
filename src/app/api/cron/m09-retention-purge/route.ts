/**
 * src/app/api/cron/m09-retention-purge/route.ts
 * NAWASENA M09 — Cron: purge KP/Kasuh logs older than 2 years.
 *
 * Schedule: 30 3 * * * (daily at 03:30)
 * Audit logs M09_RETENTION_PURGE per run.
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { auditLog } from '@/services/audit-log.service';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron:m09-retention-purge');

const RETENTION_YEARS = 2;

export const GET = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (_req, ctx) => {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - RETENTION_YEARS);

    ctx.log.info('Running M09 retention purge', { cutoffDate: cutoffDate.toISOString() });

    // Dry-run count first
    const [dailyCount, weeklyCount, kasuhCount] = await Promise.all([
      prisma.kPLogDaily.count({ where: { date: { lt: cutoffDate } } }),
      prisma.kPLogWeekly.count({ where: { submittedAt: { lt: cutoffDate } } }),
      prisma.kasuhLog.count({ where: { submittedAt: { lt: cutoffDate } } }),
    ]);

    log.info('Records to purge', { dailyCount, weeklyCount, kasuhCount, cutoffDate });

    if (process.env.M09_RETENTION_DRY_RUN === 'true') {
      ctx.log.info('Dry run mode — no records deleted');
      return ApiResponse.success({
        dryRun: true,
        cutoffDate: cutoffDate.toISOString(),
        toDelete: { dailyCount, weeklyCount, kasuhCount },
      });
    }

    // Purge
    const [deletedDaily, deletedWeekly, deletedKasuh] = await Promise.all([
      prisma.kPLogDaily.deleteMany({ where: { date: { lt: cutoffDate } } }),
      prisma.kPLogWeekly.deleteMany({ where: { submittedAt: { lt: cutoffDate } } }),
      prisma.kasuhLog.deleteMany({ where: { submittedAt: { lt: cutoffDate } } }),
    ]);

    // Audit log
    await auditLog.record({
      userId: 'SYSTEM',
      action: 'M09_RETENTION_PURGE',
      resource: 'M09Logs',
      metadata: {
        cutoffDate: cutoffDate.toISOString(),
        deletedDaily: deletedDaily.count,
        deletedWeekly: deletedWeekly.count,
        deletedKasuh: deletedKasuh.count,
      },
    });

    ctx.log.info('M09 retention purge complete', {
      deletedDaily: deletedDaily.count,
      deletedWeekly: deletedWeekly.count,
      deletedKasuh: deletedKasuh.count,
    });

    return ApiResponse.success({
      dryRun: false,
      cutoffDate: cutoffDate.toISOString(),
      deleted: {
        daily: deletedDaily.count,
        weekly: deletedWeekly.count,
        kasuh: deletedKasuh.count,
      },
    });
  },
});

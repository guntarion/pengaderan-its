/**
 * src/app/api/cron/m08-evaluation-overdue-flag/route.ts
 * NAWASENA M08 — Cron: Flag overdue evaluations.
 *
 * Schedule: 0 2 * * * (daily at 02:00 UTC)
 * Finds DONE instances without evaluation that are > 14 days old.
 * Logs audit records for SC visibility.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron:m08-evaluation-overdue-flag');

export const GET = createApiHandler({
  auth: false,
  handler: async (req, { log: ctxLog }) => {
    verifyCronAuth(req);

    ctxLog.info('Cron: m08-evaluation-overdue-flag started');

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Find DONE instances without evaluation > 14 days ago
    const overdueInstances = await prisma.kegiatanInstance.findMany({
      where: {
        status: 'DONE',
        executedAt: { lt: fourteenDaysAgo },
        evaluation: null,
      },
      select: {
        id: true,
        organizationId: true,
        executedAt: true,
        kegiatan: { select: { nama: true } },
      },
    });

    if (overdueInstances.length > 0) {
      log.warn('Overdue evaluations found', {
        count: overdueInstances.length,
        instances: overdueInstances.map((i) => ({
          id: i.id,
          nama: i.kegiatan.nama,
          executedAt: i.executedAt,
        })),
      });
    }

    ctxLog.info('Cron: m08-evaluation-overdue-flag complete', { overdueCount: overdueInstances.length });

    return ApiResponse.success({ overdueCount: overdueInstances.length });
  },
});

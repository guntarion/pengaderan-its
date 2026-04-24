/**
 * src/app/api/cron/m08-auto-running/route.ts
 * NAWASENA M08 — Cron: Auto-transition PLANNED → RUNNING.
 *
 * Schedule: every 15 minutes (cron: "STAR/15 * * * *")
 * Finds PLANNED instances that have scheduledAt <= now and transitions them to RUNNING.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron:m08-auto-running');

export const GET = createApiHandler({
  auth: false,
  handler: async (req, { log: ctxLog }) => {
    verifyCronAuth(req);

    ctxLog.info('Cron: m08-auto-running started');

    const now = new Date();

    // Find all PLANNED instances that should have started
    const dueInstances = await prisma.kegiatanInstance.findMany({
      where: {
        status: 'PLANNED',
        scheduledAt: { lte: now },
      },
      select: { id: true, organizationId: true, version: true },
    });

    let transitioned = 0;
    let failed = 0;

    for (const instance of dueInstances) {
      try {
        await prisma.kegiatanInstance.updateMany({
          where: { id: instance.id, status: 'PLANNED', version: instance.version },
          data: { status: 'RUNNING', version: { increment: 1 } },
        });

        await logAudit({
          action: AuditAction.KEGIATAN_INSTANCE_STATUS_CHANGE,
          organizationId: instance.organizationId,
          actorUserId: 'SYSTEM_CRON',
          entityType: 'KegiatanInstance',
          entityId: instance.id,
          metadata: { auto: true, cronJob: 'm08-auto-running' },
        });

        transitioned++;
      } catch (err) {
        log.error('Auto-running transition failed', { instanceId: instance.id, error: err });
        failed++;
      }
    }

    ctxLog.info('Cron: m08-auto-running complete', { transitioned, failed });

    return ApiResponse.success({ transitioned, failed });
  },
});

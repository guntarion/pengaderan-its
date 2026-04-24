/**
 * src/lib/event/retention.ts
 * NAWASENA M06 — Data retention purge helper.
 *
 * Purges KegiatanInstance (and cascaded RSVP/EventNPS/Attendance) older than 3 years.
 * Called by M01 monthly retention cron.
 *
 * Deletes in batches of 100 to avoid long-running transactions.
 * Logs each batch with DATA_RETENTION_PURGE_M06 audit entry.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('event:retention');

const BATCH_SIZE = 100;
const RETENTION_YEARS = 3;

export interface RetentionPurgeResult {
  deletedInstances: number;
  batches: number;
}

/**
 * Purge expired KegiatanInstance records (older than 3 years from scheduledAt).
 * FK cascade handles RSVP, EventNPS, Attendance deletion.
 */
export async function purgeExpiredInstances(
  organizationId?: string,
): Promise<RetentionPurgeResult> {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - RETENTION_YEARS);

  log.info('Starting M06 retention purge', { cutoffDate, organizationId });

  let totalDeleted = 0;
  let batches = 0;

  while (true) {
    // Find next batch of expired instances
    const expiredInstances = await prisma.kegiatanInstance.findMany({
      where: {
        scheduledAt: { lt: cutoffDate },
        ...(organizationId ? { organizationId } : {}),
      },
      select: { id: true, organizationId: true, scheduledAt: true },
      take: BATCH_SIZE,
    });

    if (expiredInstances.length === 0) break;

    const ids = expiredInstances.map((i) => i.id);

    await prisma.$transaction(async (tx) => {
      // Delete instances (cascade handles RSVP/EventNPS/Attendance)
      const deleted = await tx.kegiatanInstance.deleteMany({
        where: { id: { in: ids } },
      });

      // Audit log per batch
      await tx.nawasenaAuditLog.create({
        data: {
          action: 'DATA_RETENTION_PURGE_M06',
          entityType: 'KegiatanInstance',
          entityId: 'batch',
          organizationId: organizationId ?? expiredInstances[0]?.organizationId ?? null,
          afterValue: {
            deletedCount: deleted.count,
            cutoffDate: cutoffDate.toISOString(),
            instanceIds: ids,
          },
          metadata: {
            batchNumber: batches + 1,
            retentionYears: RETENTION_YEARS,
          },
        },
      });

      totalDeleted += deleted.count;
    });

    batches++;
    log.info('Retention batch completed', { batch: batches, deleted: expiredInstances.length });

    if (expiredInstances.length < BATCH_SIZE) break;
  }

  log.info('M06 retention purge completed', { totalDeleted, batches });
  return { deletedInstances: totalDeleted, batches };
}

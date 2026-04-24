/**
 * src/lib/event-execution/services/reschedule.service.ts
 * NAWASENA M08 — Instance rescheduling service.
 *
 * - rescheduleInstance: change scheduledAt, max 3 times
 * - Notifies confirmed RSVPs via M15
 * - Audit log LIFECYCLE_RESCHEDULE
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import { invalidateInstanceCache } from '../cache/invalidate';
import { batchSendNotification, getConfirmedRsvpUserIds } from '../notif/batch-send';

const log = createLogger('event-execution:reschedule-service');

const MAX_RESCHEDULE_COUNT = 3;

export async function rescheduleInstance(
  instanceId: string,
  newScheduledAt: string,
  userId: string,
  organizationId: string,
  reason?: string | null,
): Promise<void> {
  log.info('Rescheduling instance', { instanceId, newScheduledAt, userId });

  const instance = await prisma.kegiatanInstance.findFirst({
    where: { id: instanceId, organizationId },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      rescheduleCount: true,
      kegiatan: { select: { nama: true } },
    },
  });

  if (!instance) {
    throw new Error('NOT_FOUND: Instance tidak ditemukan.');
  }

  if (!['PLANNED', 'RUNNING'].includes(instance.status)) {
    throw new Error('INVALID_STATE: Hanya instance PLANNED atau RUNNING yang bisa dijadwal ulang.');
  }

  if (instance.rescheduleCount >= MAX_RESCHEDULE_COUNT) {
    throw new Error(`LIMIT_EXCEEDED: Maksimal ${MAX_RESCHEDULE_COUNT}x reschedule tercapai.`);
  }

  const oldScheduledAt = instance.scheduledAt;
  const newDate = new Date(newScheduledAt);

  await prisma.kegiatanInstance.update({
    where: { id: instanceId },
    data: {
      scheduledAt: newDate,
      rescheduleCount: { increment: 1 },
      lastRescheduledAt: new Date(),
      lastRescheduledById: userId,
      version: { increment: 1 },
    },
  });

  await logAudit({
    action: AuditAction.KEGIATAN_INSTANCE_RESCHEDULED,
    organizationId,
    actorUserId: userId,
    entityType: 'KegiatanInstance',
    entityId: instanceId,
    beforeValue: { scheduledAt: oldScheduledAt.toISOString(), rescheduleCount: instance.rescheduleCount },
    afterValue: { scheduledAt: newScheduledAt, rescheduleCount: instance.rescheduleCount + 1 },
    metadata: { reason: reason ?? null },
  });

  await invalidateInstanceCache(instanceId);

  // Notify confirmed RSVPs
  try {
    const userIds = await getConfirmedRsvpUserIds(instanceId, organizationId);
    if (userIds.length > 0) {
      await batchSendNotification(
        userIds,
        'EVENT_RESCHEDULED',
        {
          instanceId,
          kegiatanNama: instance.kegiatan.nama,
          oldScheduledAt: oldScheduledAt.toISOString(),
          newScheduledAt,
          reason: reason ?? '',
        },
        instanceId,
        organizationId,
      );
    }
  } catch (err) {
    log.error('Reschedule notification failed', { instanceId, error: err });
  }

  log.info('Rescheduled successfully', { instanceId, newScheduledAt });
}

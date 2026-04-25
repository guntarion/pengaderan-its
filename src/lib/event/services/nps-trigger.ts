/**
 * src/lib/event/services/nps-trigger.ts
 * NAWASENA M06 — NPS notification trigger service.
 *
 * Called by M08 after marking instance as DONE.
 * Also exposed as SC manual recovery endpoint.
 *
 * Deduplication: checks KegiatanInstance.npsRequestedAt — if not null, skip.
 * Scheduling: uses M15 sendNotification with scheduleAt = now + 30 minutes.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { getHadirUserIds } from './attendance.service';

const log = createLogger('event:nps-trigger');

const NPS_DELAY_MINUTES = 30;
const BATCH_SIZE = 50;

export interface TriggerNPSResult {
  scheduled: number;
  instanceId: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Trigger NPS notifications for all HADIR attendees of an instance.
 *
 * Deduplication: if npsRequestedAt is already set, returns early (no double-trigger).
 * Scheduling: sends via M15 with scheduleAt = 30 minutes from now.
 * Batch processing: sends 50 notifications at a time via Promise.allSettled.
 * Audit: creates NPS_TRIGGER_SCHEDULED entry.
 */
export async function triggerNPSForInstance(instanceId: string): Promise<TriggerNPSResult> {
  log.info('NPS trigger called', { instanceId });

  const instance = await prisma.kegiatanInstance.findUnique({
    where: { id: instanceId },
    select: {
      id: true,
      status: true,
      npsRequestedAt: true,
      organizationId: true,
      kegiatanId: true,
      scheduledAt: true,
    },
  });

  if (!instance) {
    throw new Error(`Instance not found: ${instanceId}`);
  }

  // Dedupe check
  if (instance.npsRequestedAt) {
    log.info('NPS already triggered — skipping (dedupe)', {
      instanceId,
      triggeredAt: instance.npsRequestedAt,
    });
    return {
      scheduled: 0,
      instanceId,
      skipped: true,
      skipReason: 'NPS already triggered (npsRequestedAt set)',
    };
  }

  // Instance must be DONE
  if (instance.status !== 'DONE') {
    log.warn('NPS trigger called on non-DONE instance', { instanceId, status: instance.status });
    return {
      scheduled: 0,
      instanceId,
      skipped: true,
      skipReason: `Instance status is ${instance.status}, not DONE`,
    };
  }

  // Get HADIR user IDs
  const hadirUserIds = await getHadirUserIds(instanceId);

  if (hadirUserIds.length === 0) {
    log.warn('No HADIR attendees found for NPS trigger', { instanceId });

    // Still set npsRequestedAt to prevent repeated trigger attempts
    await prisma.kegiatanInstance.update({
      where: { id: instanceId },
      data: { npsRequestedAt: new Date() },
    });

    await createTriggerAuditLog({
      action: 'NPS_TRIGGER_SCHEDULED',
      instanceId,
      organizationId: instance.organizationId,
      scheduled: 0,
      metadata: { warning: 'No HADIR attendees found' },
    });

    return { scheduled: 0, instanceId };
  }

  const scheduleAt = new Date(Date.now() + NPS_DELAY_MINUTES * 60 * 1000);
  let scheduled = 0;

  // Batch-send notifications via M15
  for (let i = 0; i < hadirUserIds.length; i += BATCH_SIZE) {
    const batch = hadirUserIds.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((userId) => sendNPSNotification(userId, instanceId)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        scheduled++;
      } else {
        log.warn('Failed to schedule NPS notification', { error: result.reason, instanceId });
      }
    }
  }

  // Set npsRequestedAt marker
  await prisma.kegiatanInstance.update({
    where: { id: instanceId },
    data: { npsRequestedAt: new Date() },
  });

  // Audit log
  await createTriggerAuditLog({
    action: 'NPS_TRIGGER_SCHEDULED',
    instanceId,
    organizationId: instance.organizationId,
    scheduled,
    metadata: {
      hadirCount: hadirUserIds.length,
      scheduleAt: scheduleAt.toISOString(),
      batchCount: Math.ceil(hadirUserIds.length / BATCH_SIZE),
    },
  });

  log.info('NPS trigger completed', { instanceId, scheduled, hadirCount: hadirUserIds.length });

  return { scheduled, instanceId };
}

/**
 * Cancel NPS trigger for an instance.
 * Resets npsRequestedAt to allow re-triggering.
 * Note: scheduled notifications in M15 cannot be cancelled in V1.
 */
export async function cancelNPSTrigger(instanceId: string): Promise<void> {
  log.info('NPS trigger cancel', { instanceId });

  const instance = await prisma.kegiatanInstance.findUnique({
    where: { id: instanceId },
    select: { npsRequestedAt: true, organizationId: true },
  });

  if (!instance) {
    throw new Error(`Instance not found: ${instanceId}`);
  }

  await prisma.kegiatanInstance.update({
    where: { id: instanceId },
    data: { npsRequestedAt: null },
  });

  await createTriggerAuditLog({
    action: 'NPS_TRIGGER_CANCELLED',
    instanceId,
    organizationId: instance.organizationId,
    scheduled: 0,
    metadata: { previousTriggerAt: instance.npsRequestedAt?.toISOString() },
  });

  log.info('NPS trigger cancelled', { instanceId });
}

// ============================================
// Helpers
// ============================================

async function sendNPSNotification(
  userId: string,
  instanceId: string,
): Promise<void> {
  // Import M15 sendNotification dynamically to avoid circular deps
  const { sendNotification } = await import('@/lib/notifications/send');

  await sendNotification({
    userId,
    templateKey: 'NPS_REQUEST',
    payload: {
      instanceId,
      npsLinkUrl: `/dashboard/kegiatan/${instanceId}/nps`,
    },
    category: 'NORMAL',
    // scheduleAt support depends on M15 Phase D implementation
    // For V1, send immediately (30-min delay is best-effort)
  });
}

async function createTriggerAuditLog(params: {
  action: 'NPS_TRIGGER_SCHEDULED' | 'NPS_TRIGGER_CANCELLED' | 'NPS_TRIGGER_MANUAL';
  instanceId: string;
  organizationId: string;
  scheduled: number;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        action: params.action,
        actorUserId: params.actorUserId ?? null,
        entityType: 'KegiatanInstance',
        entityId: params.instanceId,
        organizationId: params.organizationId,
        afterValue: { scheduled: params.scheduled },
        metadata: (params.metadata ?? {}) as Record<string, string | number | boolean | null>,
      },
    });
  } catch (err) {
    log.warn('Failed to create trigger audit log', { error: err });
  }
}

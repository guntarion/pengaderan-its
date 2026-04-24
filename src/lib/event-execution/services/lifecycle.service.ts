/**
 * src/lib/event-execution/services/lifecycle.service.ts
 * NAWASENA M08 — Instance lifecycle state machine.
 *
 * Valid transitions:
 *   PLANNED → RUNNING (manual by OC or auto cron)
 *   PLANNED → CANCELLED
 *   RUNNING → DONE
 *   RUNNING → CANCELLED
 *   PLANNED → PLANNED (reschedule)
 *
 * After-commit hooks:
 *   DONE: autoSetAlpaOnDone + triggerNPSForInstance + (TODO: EVALUATION_REMINDER M15)
 *   CANCELLED: cascadeNotif + cancelNPSTrigger
 *
 * revertBySC: SC force-revert with reason + audit
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction, InstanceStatus } from '@prisma/client';
import { invalidateInstanceCache } from '../cache/invalidate';
import { autoSetAlpaOnDone } from './attendance.service';
import { batchSendNotification, getConfirmedRsvpUserIds } from '../notif/batch-send';
import type { LifecycleInput, LifecycleRevertInput } from '../schemas';

const log = createLogger('event-execution:lifecycle-service');

// Allowed transitions
const ALLOWED_TRANSITIONS: Record<string, InstanceStatus[]> = {
  PLANNED: [InstanceStatus.RUNNING, InstanceStatus.CANCELLED],
  RUNNING: [InstanceStatus.DONE, InstanceStatus.CANCELLED],
  DONE: [],
  CANCELLED: [],
};

// Action to new status mapping
const ACTION_STATUS: Record<string, InstanceStatus> = {
  start: InstanceStatus.RUNNING,
  finish: InstanceStatus.DONE,
  cancel: InstanceStatus.CANCELLED,
};

export interface TransitionResult {
  instanceId: string;
  fromStatus: InstanceStatus;
  toStatus: InstanceStatus;
  version: number;
}

/**
 * Transition instance lifecycle with optimistic lock.
 */
export async function transition(
  instanceId: string,
  input: LifecycleInput,
  userId: string,
  organizationId: string,
): Promise<TransitionResult> {
  const { action, version } = input;
  log.info('Lifecycle transition', { instanceId, action, userId });

  if (action === 'reschedule') {
    // Reschedule is a separate operation
    throw new Error('INVALID_ACTION: Use rescheduleInstance() for rescheduling.');
  }

  const toStatus = ACTION_STATUS[action];
  if (!toStatus) {
    throw new Error(`INVALID_ACTION: Unknown action "${action}".`);
  }

  // Fetch with optimistic lock check
  const instance = await prisma.kegiatanInstance.findFirst({
    where: { id: instanceId, organizationId },
    select: { id: true, status: true, version: true, cohortId: true },
  });

  if (!instance) {
    throw new Error('NOT_FOUND: Instance tidak ditemukan.');
  }

  // Optimistic lock check
  if (instance.version !== version) {
    throw new Error(`CONFLICT: Instance telah diubah oleh pengguna lain. Muat ulang halaman (version ${instance.version} vs ${version}).`);
  }

  const fromStatus = instance.status as InstanceStatus;

  // Validate transition
  const allowedNext = ALLOWED_TRANSITIONS[fromStatus] ?? [];
  if (!allowedNext.includes(toStatus)) {
    throw new Error(`INVALID_TRANSITION: Tidak bisa pindah dari ${fromStatus} ke ${toStatus}.`);
  }

  // Cancellation requires reason
  if (toStatus === InstanceStatus.CANCELLED && !input.reason) {
    throw new Error('VALIDATION: Alasan pembatalan wajib diisi (min 20 karakter).');
  }

  // Perform update with version increment
  const updated = await prisma.kegiatanInstance.update({
    where: { id: instanceId, version },
    data: {
      status: toStatus,
      version: { increment: 1 },
      ...(toStatus === InstanceStatus.DONE ? { executedAt: new Date() } : {}),
      ...(toStatus === InstanceStatus.CANCELLED
        ? {
            cancelledAt: new Date(),
            cancelledById: userId,
            cancellationReason: input.reason ?? null,
          }
        : {}),
    },
    select: { id: true, status: true, version: true },
  });

  if (!updated) {
    // Concurrent modification
    throw new Error('CONFLICT: Optimistic lock conflict. Muat ulang halaman.');
  }

  // Audit log
  const auditAction =
    toStatus === InstanceStatus.CANCELLED
      ? AuditAction.KEGIATAN_INSTANCE_CANCELLED
      : AuditAction.KEGIATAN_INSTANCE_STATUS_CHANGE;

  await logAudit({
    action: auditAction,
    organizationId,
    actorUserId: userId,
    entityType: 'KegiatanInstance',
    entityId: instanceId,
    beforeValue: { status: fromStatus, version },
    afterValue: { status: toStatus, version: updated.version },
    metadata: { reason: input.reason ?? null },
  });

  // Invalidate cache
  await invalidateInstanceCache(instanceId);

  // After-commit hooks (wrapped in try/catch — don't fail the transition)
  if (toStatus === InstanceStatus.DONE) {
    await handleDoneHooks(instanceId, userId, organizationId);
  } else if (toStatus === InstanceStatus.CANCELLED) {
    await handleCancelledHooks(instanceId, organizationId, input.reason ?? '');
  }

  log.info('Lifecycle transition complete', { instanceId, fromStatus, toStatus });

  return { instanceId, fromStatus, toStatus, version: updated.version };
}

async function handleDoneHooks(
  instanceId: string,
  userId: string,
  organizationId: string,
): Promise<void> {
  try {
    // 1. Auto-set ALPA for non-present RSVPs
    await autoSetAlpaOnDone(instanceId, userId, organizationId);
  } catch (err) {
    log.error('autoSetAlpaOnDone failed', { instanceId, error: err });
  }

  try {
    // 2. Trigger NPS window (M06)
    const { triggerNPSForInstance } = await import('@/lib/event/services/nps-trigger');
    await triggerNPSForInstance(instanceId);
  } catch (err) {
    log.error('triggerNPSForInstance failed', { instanceId, error: err });
  }

  // 3. TODO Phase H+: Schedule EVALUATION_REMINDER via M15
  // await scheduleEvaluationReminder(instanceId, organizationId);
}

async function handleCancelledHooks(
  instanceId: string,
  organizationId: string,
  reason: string,
): Promise<void> {
  try {
    // 1. Cancel NPS trigger if any
    const { cancelNPSTrigger } = await import('@/lib/event/services/nps-trigger');
    await cancelNPSTrigger(instanceId);
  } catch (err) {
    log.error('cancelNPSTrigger failed', { instanceId, error: err });
  }

  try {
    // 2. Batch notify all confirmed RSVPs
    const userIds = await getConfirmedRsvpUserIds(instanceId, organizationId);
    if (userIds.length > 0) {
      await batchSendNotification(
        userIds,
        'EVENT_CANCELLED',
        { instanceId, reason },
        instanceId,
        organizationId,
      );
    }
  } catch (err) {
    log.error('Cancellation notification failed', { instanceId, error: err });
  }
}

/**
 * SC revert a lifecycle state (e.g. DONE → RUNNING).
 */
export async function revertBySC(
  instanceId: string,
  input: LifecycleRevertInput,
  scUserId: string,
  organizationId: string,
): Promise<TransitionResult> {
  const { fromStatus, toStatus, reason, version } = input;
  log.info('SC lifecycle revert', { instanceId, fromStatus, toStatus, scUserId });

  const instance = await prisma.kegiatanInstance.findFirst({
    where: { id: instanceId, organizationId },
    select: { id: true, status: true, version: true },
  });

  if (!instance) {
    throw new Error('NOT_FOUND: Instance tidak ditemukan.');
  }

  if (instance.version !== version) {
    throw new Error(`CONFLICT: Version mismatch (${instance.version} vs ${version}).`);
  }

  if (instance.status !== fromStatus) {
    throw new Error(`INVALID_STATE: Instance bukan dalam status ${fromStatus}.`);
  }

  // If reverting from DONE, cancel NPS
  if (fromStatus === 'DONE') {
    try {
      const { cancelNPSTrigger } = await import('@/lib/event/services/nps-trigger');
      await cancelNPSTrigger(instanceId);
    } catch (err) {
      log.warn('cancelNPSTrigger failed during revert', { instanceId, error: err });
    }
  }

  const updated = await prisma.kegiatanInstance.update({
    where: { id: instanceId },
    data: {
      status: toStatus as InstanceStatus,
      version: { increment: 1 },
      ...(toStatus !== 'CANCELLED' ? { cancelledAt: null, cancelledById: null, cancellationReason: null } : {}),
      ...(toStatus !== 'DONE' ? { executedAt: null } : {}),
    },
    select: { version: true },
  });

  await logAudit({
    action: AuditAction.KEGIATAN_INSTANCE_LIFECYCLE_REVERT,
    organizationId,
    actorUserId: scUserId,
    entityType: 'KegiatanInstance',
    entityId: instanceId,
    beforeValue: { status: fromStatus, version },
    afterValue: { status: toStatus, version: updated.version },
    metadata: { reason },
  });

  await invalidateInstanceCache(instanceId);

  log.info('SC revert complete', { instanceId, fromStatus, toStatus });

  return {
    instanceId,
    fromStatus: fromStatus as InstanceStatus,
    toStatus: toStatus as InstanceStatus,
    version: updated.version,
  };
}

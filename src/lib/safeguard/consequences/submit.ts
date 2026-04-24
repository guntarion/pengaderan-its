/**
 * src/lib/safeguard/consequences/submit.ts
 * NAWASENA M10 — Maba submits completion of a consequence.
 *
 * Only the assigned target user (maba) can submit.
 * Validates status is ASSIGNED or NEEDS_REVISION.
 * Notifies SC via M15 CONSEQUENCE_COMPLETED_SC (fail-silently).
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import {
  ConsequenceStatus,
  AuditAction,
  Prisma,
} from '@prisma/client';

const log = createLogger('safeguard:consequences:submit');

export interface SubmitConsequencePayload {
  notesAfter?: string;
  attachmentKey?: string; // S3 key for submitted file (optional)
}

/**
 * Submit completion of a consequence by the assigned maba.
 *
 * @param consequenceId - ID of the ConsequenceLog
 * @param mabaUserId    - User ID of the maba submitting (must match consequence.userId)
 * @param payload       - Submission payload (notes + optional attachment key)
 * @throws Error with code 'FORBIDDEN' if mabaUserId does not match
 * @throws Error with code 'INVALID_STATUS' if consequence is not in ASSIGNED/NEEDS_REVISION
 */
export async function submitCompletion(
  consequenceId: string,
  mabaUserId: string,
  payload: SubmitConsequencePayload,
  meta?: { ipAddress?: string; userAgent?: string },
) {
  log.info('Submitting consequence completion', { consequenceId, mabaUserId });

  const consequence = await prisma.consequenceLog.findUnique({
    where: { id: consequenceId },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      type: true,
      status: true,
      relatedIncidentId: true,
      assignedById: true,
    },
  });

  if (!consequence) {
    const err = new Error(`Consequence not found: ${consequenceId}`);
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }

  // ---- Ownership check ----
  if (consequence.userId !== mabaUserId) {
    const err = new Error('Hanya pemilik konsekuensi yang dapat submit penyelesaian.');
    (err as NodeJS.ErrnoException).code = 'FORBIDDEN';
    throw err;
  }

  // ---- Status check ----
  if (
    consequence.status !== ConsequenceStatus.ASSIGNED &&
    consequence.status !== ConsequenceStatus.NEEDS_REVISION
  ) {
    const err = new Error(
      `Konsekuensi tidak dapat di-submit karena status saat ini: ${consequence.status}`,
    );
    (err as NodeJS.ErrnoException).code = 'INVALID_STATUS';
    throw err;
  }

  // ---- Update status ----
  const updated = await prisma.consequenceLog.update({
    where: { id: consequenceId },
    data: {
      status: ConsequenceStatus.PENDING_REVIEW,
      submittedAt: new Date(),
      notesAfter: payload.notesAfter,
      attachmentKey: payload.attachmentKey,
    },
  });

  // ---- Audit log ----
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        action: AuditAction.CONSEQUENCE_SUBMIT,
        actorUserId: mabaUserId,
        organizationId: consequence.organizationId,
        entityType: 'ConsequenceLog',
        entityId: consequenceId,
        beforeValue: { status: consequence.status } as Prisma.InputJsonValue,
        afterValue: { status: ConsequenceStatus.PENDING_REVIEW } as Prisma.InputJsonValue,
        metadata: { ipAddress: meta?.ipAddress } as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    log.error('Failed to write consequence submit audit log', { error: err });
  }

  // ---- Notify SC/assigner via M15 (fail-silently) ----
  Promise.allSettled([
    (async () => {
      try {
        const { sendNotification } = await import('@/lib/notifications/send');
        const maba = await prisma.user.findUnique({
          where: { id: mabaUserId },
          select: { fullName: true },
        });

        await sendNotification({
          userId: consequence.assignedById,
          templateKey: 'CONSEQUENCE_COMPLETED_SC',
          payload: {
            mabaNama: maba?.fullName ?? 'Maba',
            consequenceType: consequence.type,
            reviewUrl: `/dashboard/safeguard/consequences/${consequenceId}`,
          },
          category: 'NORMAL',
          requestId: `m10-consequence-submit-${consequenceId}`,
        });
      } catch (err) {
        log.warn('Failed to notify assigner about consequence submission', {
          consequenceId,
          error: err,
        });
      }
    })(),
  ]);

  log.info('Consequence submission complete', { consequenceId, newStatus: updated.status });

  return updated;
}

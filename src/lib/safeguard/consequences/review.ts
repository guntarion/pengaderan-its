/**
 * src/lib/safeguard/consequences/review.ts
 * NAWASENA M10 — SC/Safeguard Officer reviews a submitted consequence.
 *
 * Decision APPROVE → status APPROVED + completedAt
 * Decision REJECT  → status NEEDS_REVISION + reviewNote required
 * Notifies maba of outcome via M15 (fail-silently).
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import {
  ConsequenceStatus,
  AuditAction,
  Prisma,
} from '@prisma/client';
import type { IncidentActor } from '../types';

const log = createLogger('safeguard:consequences:review');

export type ReviewDecision = 'APPROVE' | 'REJECT';

/**
 * Review a submitted consequence completion.
 *
 * @param consequenceId - ID of the ConsequenceLog
 * @param reviewer      - Actor performing the review (SC or SG-Officer)
 * @param decision      - 'APPROVE' or 'REJECT'
 * @param reviewNote    - Required for REJECT; optional for APPROVE
 * @throws Error with code 'FORBIDDEN' if reviewer lacks permission
 * @throws Error with code 'INVALID_STATUS' if consequence is not PENDING_REVIEW
 * @throws Error with code 'VALIDATION_ERROR' if REJECT without reviewNote
 */
export async function reviewCompletion(
  consequenceId: string,
  reviewer: IncidentActor,
  decision: ReviewDecision,
  reviewNote?: string,
  meta?: { ipAddress?: string; userAgent?: string },
) {
  log.info('Reviewing consequence', { consequenceId, reviewerId: reviewer.id, decision });

  // ---- Role check ----
  const isAllowed = reviewer.role === 'SC' || reviewer.isSafeguardOfficer;
  if (!isAllowed) {
    const err = new Error('Hanya SC atau Safeguard Officer yang dapat me-review konsekuensi.');
    (err as NodeJS.ErrnoException).code = 'FORBIDDEN';
    throw err;
  }

  const consequence = await prisma.consequenceLog.findUnique({
    where: { id: consequenceId },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      type: true,
      status: true,
    },
  });

  if (!consequence) {
    const err = new Error(`Consequence not found: ${consequenceId}`);
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }

  // ---- Status check ----
  if (consequence.status !== ConsequenceStatus.PENDING_REVIEW) {
    const err = new Error(
      `Konsekuensi tidak dapat di-review karena status saat ini: ${consequence.status}`,
    );
    (err as NodeJS.ErrnoException).code = 'INVALID_STATUS';
    throw err;
  }

  // ---- Validate review note for REJECT ----
  if (decision === 'REJECT' && (!reviewNote || reviewNote.trim().length < 10)) {
    const err = new Error('Catatan review wajib diisi minimal 10 karakter untuk keputusan REJECT.');
    (err as NodeJS.ErrnoException).code = 'VALIDATION_ERROR';
    throw err;
  }

  const now = new Date();
  const newStatus =
    decision === 'APPROVE' ? ConsequenceStatus.APPROVED : ConsequenceStatus.NEEDS_REVISION;

  const updated = await prisma.consequenceLog.update({
    where: { id: consequenceId },
    data: {
      status: newStatus,
      reviewedById: reviewer.id,
      reviewedAt: now,
      reviewNote: reviewNote?.trim(),
      completedAt: decision === 'APPROVE' ? now : null,
    },
  });

  // ---- Audit log ----
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        action: decision === 'APPROVE' ? AuditAction.CONSEQUENCE_APPROVE : AuditAction.CONSEQUENCE_REJECT,
        actorUserId: reviewer.id,
        organizationId: consequence.organizationId,
        entityType: 'ConsequenceLog',
        entityId: consequenceId,
        beforeValue: { status: consequence.status } as Prisma.InputJsonValue,
        afterValue: { status: newStatus, decision } as Prisma.InputJsonValue,
        metadata: { ipAddress: meta?.ipAddress } as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    log.error('Failed to write consequence review audit log', { error: err });
  }

  // ---- Notify maba of outcome (fail-silently) ----
  Promise.allSettled([
    (async () => {
      try {
        const { sendNotification } = await import('@/lib/notifications/send');
        const templateKey =
          decision === 'APPROVE' ? 'CONSEQUENCE_COMPLETED_SC' : 'CONSEQUENCE_ASSIGNED_MABA';
        await sendNotification({
          userId: consequence.userId,
          templateKey,
          payload: {
            consequenceType: consequence.type,
            decision,
            reviewNote,
            konsekuensiUrl: `/dashboard/konsekuensi/${consequenceId}`,
          },
          category: 'NORMAL',
          requestId: `m10-consequence-review-${consequenceId}`,
        });
      } catch (err) {
        log.warn('Failed to notify maba about consequence review', {
          consequenceId,
          error: err,
        });
      }
    })(),
  ]);

  log.info('Consequence review complete', { consequenceId, newStatus });

  return updated;
}

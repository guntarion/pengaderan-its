/**
 * src/lib/triwulan/escalation/notifier.ts
 * NAWASENA M14 — Escalation Notifier.
 *
 * Sends M15 notifications when escalation is detected.
 * Non-blocking: wrapped in try/catch, errors don't break the main flow.
 *
 * V1: Creates NotificationLog entries using the M15 template system.
 * Full delivery (email/push) handled by M15 delivery worker — not in scope here.
 */

import { TriwulanEscalationLevel, TriwulanReview, UserRole, NotificationCategory, LogStatus, ChannelType } from '@prisma/client';
import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { EscalationFlag } from './rules';

const log = createLogger('m14/escalation/notifier');

/**
 * Notify relevant users about escalation flags.
 *
 * URGENT → CRITICAL to Pembina + SC + SUPERADMIN
 * WARNING → OPS to Pembina + SC
 *
 * Always non-blocking (errors caught and logged).
 */
export async function notifyEscalation(
  review: Pick<TriwulanReview, 'id' | 'organizationId' | 'cohortId' | 'quarterNumber' | 'escalationLevel'>,
  flags: EscalationFlag[]
): Promise<void> {
  try {
    if (flags.length === 0 || review.escalationLevel === TriwulanEscalationLevel.NONE) {
      return;
    }

    const isUrgent = review.escalationLevel === TriwulanEscalationLevel.URGENT;
    const templateKey = 'TRIWULAN_ESCALATION_URGENT';

    // Find target users
    const targetRoles: UserRole[] = isUrgent
      ? [UserRole.PEMBINA, UserRole.SC, UserRole.SUPERADMIN]
      : [UserRole.PEMBINA, UserRole.SC];

    const [targetUsers, templateVersion, cohort] = await Promise.all([
      prisma.user.findMany({
        where: {
          organizationId: review.organizationId,
          role: { in: targetRoles },
          status: 'ACTIVE',
        },
        select: { id: true },
      }),
      prisma.notificationTemplate.findFirst({
        where: { templateKey },
        select: { activeVersionId: true, id: true },
      }),
      prisma.cohort.findUnique({
        where: { id: review.cohortId },
        select: { code: true },
      }),
    ]);

    if (!templateVersion?.activeVersionId) {
      log.warn('Escalation notification template not found — skipping', { templateKey });
      return;
    }

    const category: NotificationCategory = isUrgent
      ? NotificationCategory.CRITICAL
      : NotificationCategory.OPS;

    log.info('Sending escalation notifications', {
      reviewId: review.id,
      level: review.escalationLevel,
      targetCount: targetUsers.length,
      flagCount: flags.length,
    });

    for (const user of targetUsers) {
      try {
        await prisma.notificationLog.create({
          data: {
            organizationId: review.organizationId,
            userId: user.id,
            templateKey,
            templateVersionId: templateVersion.activeVersionId,
            channel: ChannelType.IN_APP,
            category,
            status: LogStatus.QUEUED,
            metadata: {
              reviewId: review.id,
              cohortCode: cohort?.code ?? review.cohortId,
              quarterNumber: review.quarterNumber,
              escalationFlags: flags.map((f) => f.rule),
              reviewUrl: `/dashboard/sc/triwulan/${review.id}`,
            },
          },
        });
      } catch (userErr) {
        log.warn('Failed to create notification for user', { userId: user.id, error: userErr });
      }
    }

    log.info('Escalation notifications queued', {
      reviewId: review.id,
      notificationCount: targetUsers.length,
    });
  } catch (err) {
    log.error('Escalation notification failed (non-blocking)', { error: err, reviewId: review.id });
  }
}

/**
 * Notify SC when revision is requested.
 * Non-blocking.
 */
export async function notifyRevisionRequested(
  reviewId: string,
  newReviewId: string,
  organizationId: string,
  cohortId: string,
  quarterNumber: number,
  requestedByName: string,
  requestedByRole: string,
  reason: string
): Promise<void> {
  try {
    const templateKey = 'TRIWULAN_REVISION_REQUESTED';
    const [cohort, scUsers, templateVersion] = await Promise.all([
      prisma.cohort.findUnique({ where: { id: cohortId }, select: { code: true } }),
      prisma.user.findMany({
        where: { organizationId, role: UserRole.SC, status: 'ACTIVE' },
        select: { id: true },
      }),
      prisma.notificationTemplate.findFirst({
        where: { templateKey },
        select: { activeVersionId: true },
      }),
    ]);

    if (!templateVersion?.activeVersionId) {
      log.warn('Revision notification template not found — skipping', { templateKey });
      return;
    }

    for (const user of scUsers) {
      await prisma.notificationLog.create({
        data: {
          organizationId,
          userId: user.id,
          templateKey,
          templateVersionId: templateVersion.activeVersionId,
          channel: ChannelType.IN_APP,
          category: NotificationCategory.OPS,
          status: LogStatus.QUEUED,
          metadata: {
            reviewId, newReviewId,
            cohortCode: cohort?.code ?? cohortId,
            quarterNumber, requestedByName, requestedByRole, reason,
          },
        },
      });
    }
  } catch (err) {
    log.error('Revision notification failed (non-blocking)', { error: err, reviewId });
  }
}

/**
 * Notify SC + SUPERADMIN when PDF export fails.
 * Non-blocking.
 */
export async function notifyPDFExportFailed(
  reviewId: string,
  organizationId: string,
  cohortId: string,
  quarterNumber: number,
  errorMessage: string,
  retryCount: number
): Promise<void> {
  try {
    const templateKey = 'TRIWULAN_PDF_EXPORT_FAILED';
    const [cohort, targetUsers, templateVersion] = await Promise.all([
      prisma.cohort.findUnique({ where: { id: cohortId }, select: { code: true } }),
      prisma.user.findMany({
        where: {
          organizationId,
          role: { in: [UserRole.SC, UserRole.SUPERADMIN] },
          status: 'ACTIVE',
        },
        select: { id: true },
      }),
      prisma.notificationTemplate.findFirst({
        where: { templateKey },
        select: { activeVersionId: true },
      }),
    ]);

    if (!templateVersion?.activeVersionId) {
      log.warn('PDF failure notification template not found — skipping', { templateKey });
      return;
    }

    for (const user of targetUsers) {
      await prisma.notificationLog.create({
        data: {
          organizationId,
          userId: user.id,
          templateKey,
          templateVersionId: templateVersion.activeVersionId,
          channel: ChannelType.IN_APP,
          category: NotificationCategory.CRITICAL,
          status: LogStatus.QUEUED,
          metadata: {
            reviewId,
            cohortCode: cohort?.code ?? cohortId,
            quarterNumber, errorMessage, retryCount,
          },
        },
      });
    }
  } catch (err) {
    log.error('PDF export failure notification failed (non-blocking)', { error: err, reviewId });
  }
}

/**
 * Notify BLM + Pembina when review is submitted by SC.
 * Non-blocking.
 */
export async function notifySubmittedWaitingPembina(
  reviewId: string,
  organizationId: string,
  cohortId: string,
  quarterNumber: number,
  submittedByName: string
): Promise<void> {
  try {
    const templateKey = 'TRIWULAN_SUBMITTED_WAITING_PEMBINA';
    const [cohort, pembinaUsers, templateVersion] = await Promise.all([
      prisma.cohort.findUnique({ where: { id: cohortId }, select: { code: true } }),
      prisma.user.findMany({
        where: { organizationId, role: UserRole.PEMBINA, status: 'ACTIVE' },
        select: { id: true },
      }),
      prisma.notificationTemplate.findFirst({
        where: { templateKey },
        select: { activeVersionId: true },
      }),
    ]);

    if (!templateVersion?.activeVersionId) return;

    for (const user of pembinaUsers) {
      await prisma.notificationLog.create({
        data: {
          organizationId,
          userId: user.id,
          templateKey,
          templateVersionId: templateVersion.activeVersionId,
          channel: ChannelType.IN_APP,
          category: NotificationCategory.OPS,
          status: LogStatus.QUEUED,
          metadata: {
            reviewId,
            cohortCode: cohort?.code ?? cohortId,
            quarterNumber, submittedByName,
          },
        },
      });
    }
  } catch (err) {
    log.error('Submit notification failed (non-blocking)', { error: err, reviewId });
  }
}

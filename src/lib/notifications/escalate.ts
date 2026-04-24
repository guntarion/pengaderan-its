/**
 * src/lib/notifications/escalate.ts
 * NAWASENA M15 — Escalation handler: notify KP when Maba is repeatedly silent.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import type { NotificationCategory } from '@prisma/client';

const log = createLogger('notifications:escalate');

/**
 * Escalate to a user's KP when they have been repeatedly silent on a form.
 * Calls sendNotification for the KP with KP_ESCALATION_MABA_SILENT template.
 *
 * Uses a dynamic import to avoid circular dependency with send.ts.
 */
export async function escalateToKp(
  mabaUserId: string,
  mabaName: string,
  formType: string,
  missCount: number,
  organizationId: string,
  requestId?: string,
): Promise<void> {
  log.info('Escalating silent Maba to KP', {
    mabaUserId,
    mabaName,
    formType,
    missCount,
    organizationId,
  });

  try {
    // Find the KP assigned to this Maba
    // The relationship is via KPGroup in M03: Maba is a member, KP is the coordinator
    // For V1 (M03 may not be complete), we query KP users in the same cohort
    const maba = await prisma.user.findUnique({
      where: { id: mabaUserId },
      select: { currentCohortId: true, organizationId: true, fullName: true },
    });

    if (!maba || !maba.currentCohortId) {
      log.warn('Cannot escalate — Maba has no cohort assignment', { mabaUserId });
      return;
    }

    // Find KP users in the same org (simplified: find KP users in org)
    // In full M03 integration, this would query the KPGroup.coordinatorId
    const kpUsers = await prisma.user.findMany({
      where: {
        organizationId: maba.organizationId,
        role: 'KP',
        status: 'ACTIVE',
        currentCohortId: maba.currentCohortId,
      },
      select: { id: true, fullName: true },
      take: 1, // simplification: escalate to first KP (M03 integration will refine this)
    });

    if (kpUsers.length === 0) {
      log.warn('Cannot escalate — no active KP found for Maba', {
        mabaUserId,
        cohortId: maba.currentCohortId,
      });
      return;
    }

    const kp = kpUsers[0];

    // Dynamic import to avoid circular dependency
    const { sendNotification } = await import('./send');

    await sendNotification({
      userId: kp.id,
      templateKey: 'KP_ESCALATION_MABA_SILENT',
      payload: {
        userName: kp.fullName,
        mabaName: mabaName,
        formType: formType,
        missCount: missCount,
      },
      category: 'NORMAL' as NotificationCategory,
      requestId,
    });

    log.info('Escalation sent to KP', {
      kpId: kp.id,
      kpName: kp.fullName,
      mabaUserId,
      formType,
    });
  } catch (err) {
    log.error('Escalation failed', {
      mabaUserId,
      formType,
      error: err,
    });
    // Do not rethrow — escalation failure should not block the main flow
  }
}

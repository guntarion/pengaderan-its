/**
 * src/lib/mh-screening/referral.ts
 * NAWASENA M11 — Auto-referral to SAC on RED screening result.
 *
 * createReferralForRED: Creates referral, assigns SAC round-robin, sends M15 notifs.
 * assignSACRoundRobin: Finds SAC with fewest PENDING/IN_PROGRESS referrals.
 * resolveKPForMaba: Finds KP group coordinator for a Maba.
 *
 * PRIVACY-CRITICAL:
 *   - MH_REFERRAL_SAC template: NO Maba PII in payload.
 *   - MH_SUPPORT_ALERT_KP: anonymous — no Maba name.
 *
 * Idempotent: unique constraint on (screeningId) prevents duplicate referrals.
 */

import { createLogger } from '@/lib/logger';
import { sendNotification } from '@/lib/notifications/send';
import { recordMHAccess } from './access-log';
import type { NotificationCategory } from '@prisma/client';

const log = createLogger('mh-referral');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaTransactionClient = any;

interface CreateReferralOptions {
  userId: string;
  organizationId: string;
  immediateContact: boolean;
  cohortId: string;
  actorRole?: string;
}

/**
 * Find SAC counselor with fewest active referrals (round-robin).
 * Uses SELECT FOR UPDATE SKIP LOCKED to prevent race condition.
 */
export async function assignSACRoundRobin(
  tx: PrismaTransactionClient,
  organizationId: string,
): Promise<{ id: string }> {
  const result = await tx.$queryRaw<{ id: string }[]>`
    SELECT u.id
    FROM "users" u
    LEFT JOIN "mh_referral_logs" rl
      ON rl."referredToId" = u.id
      AND rl.status IN ('PENDING', 'IN_PROGRESS')
    WHERE u."isSACCounselor" = true
      AND u."organizationId" = ${organizationId}
      AND u."status" = 'ACTIVE'
    GROUP BY u.id
    ORDER BY COUNT(rl.id) ASC
    LIMIT 1
    FOR UPDATE OF u SKIP LOCKED
  `;

  if (!result[0]) {
    throw new Error(`No active SAC counselors available in organization ${organizationId}`);
  }

  return result[0];
}

/**
 * Find KP group coordinator for a Maba.
 * Used to send anonymous support alert to KP.
 */
async function resolveKPForMaba(
  tx: PrismaTransactionClient,
  mabaId: string,
  cohortId: string,
): Promise<{ id: string } | null> {
  try {
    // Find the KP group this Maba belongs to
    const member = await tx.kPGroupMember.findFirst({
      where: {
        userId: mabaId,
        cohortId,
        status: 'ACTIVE',
      },
      include: {
        kpGroup: {
          select: {
            kpCoordinatorUserId: true,
          },
        },
      },
    });

    if (!member?.kpGroup?.kpCoordinatorUserId) {
      log.debug('No KP coordinator found for Maba', { mabaId, cohortId });
      return null;
    }

    return { id: member.kpGroup.kpCoordinatorUserId };
  } catch (err) {
    log.warn('Failed to resolve KP for Maba', { mabaId, cohortId, error: err });
    return null;
  }
}

/**
 * Create a referral for a RED screening result.
 * Idempotent — returns early if referral already exists (unique constraint on screeningId).
 *
 * MUST be called within withMHContext transaction.
 */
export async function createReferralForRED(
  screeningId: string,
  tx: PrismaTransactionClient,
  opts: CreateReferralOptions,
): Promise<void> {
  // Idempotency check
  const existing = await tx.mHReferralLog.findUnique({
    where: { screeningId },
  });

  if (existing) {
    log.info('Referral already exists for screening (idempotent)', {
      screeningId,
      referralId: existing.id,
    });
    return;
  }

  log.info('Creating RED referral', {
    screeningId,
    organizationId: opts.organizationId,
    immediateContact: opts.immediateContact,
  });

  // Round-robin SAC assignment
  const sac = await assignSACRoundRobin(tx, opts.organizationId);

  // SLA: 24h for immediate contact, 72h otherwise
  const slaHours = opts.immediateContact ? 24 : 72;
  const slaDeadlineAt = new Date(Date.now() + slaHours * 3600 * 1000);

  const referral = await tx.mHReferralLog.create({
    data: {
      screeningId,
      userId: opts.userId,
      organizationId: opts.organizationId,
      referredToId: sac.id,
      assignmentReason: 'AUTO_ROUND_ROBIN',
      slaDeadlineAt,
      status: 'PENDING',
      statusChangedAt: new Date(),
    },
  });

  // Initial timeline entry
  await tx.mHReferralTimeline.create({
    data: {
      referralId: referral.id,
      actorId: 'system',
      action: 'CREATED',
      metadata: {
        reason: 'AUTO_RED_SCREENING',
        immediateContact: opts.immediateContact,
        slaHours,
      },
    },
  });

  // Audit log
  await recordMHAccess(tx, {
    actorId: opts.userId,
    actorRole: (opts.actorRole as Parameters<typeof recordMHAccess>[1]['actorRole']) ?? 'MABA',
    action: 'READ_META',
    targetType: 'MHReferralLog',
    targetId: referral.id,
    targetUserId: opts.userId,
    organizationId: opts.organizationId,
    metadata: {
      event: 'MH_REFERRAL_CREATED',
      immediateContact: opts.immediateContact,
    },
  });

  // Send M15 CRITICAL notification to SAC (NO Maba PII)
  try {
    await sendNotification({
      userId: sac.id,
      templateKey: opts.immediateContact ? 'MH_IMMEDIATE_CONTACT' : 'MH_REFERRAL_SAC',
      payload: {
        referralId: referral.id,
        slaDeadlineAt: slaDeadlineAt.toISOString(),
        immediateContact: opts.immediateContact,
        queueUrl: '/dashboard/sac/screening-queue',
      },
      category: 'CRITICAL' as NotificationCategory,
    });

    log.info('SAC referral notification sent', {
      referralId: referral.id,
      sacId: sac.id,
    });
  } catch (err) {
    // Notification failure should NOT block the referral creation
    log.warn('Failed to send SAC referral notification', {
      referralId: referral.id,
      error: err,
    });
  }

  // Send anonymous support alert to KP (NORMAL, no Maba name)
  const kp = await resolveKPForMaba(tx, opts.userId, opts.cohortId);
  if (kp) {
    try {
      await sendNotification({
        userId: kp.id,
        templateKey: 'MH_SUPPORT_ALERT_KP',
        payload: {
          tipsLink: '/mental-health/help-seeking',
        },
        category: 'NORMAL' as NotificationCategory,
      });

      log.info('KP anonymous support alert sent', {
        referralId: referral.id,
        // Note: NOT logging kp.id here to avoid linking KP to specific referral in log
      });
    } catch (err) {
      log.warn('Failed to send KP support alert', {
        referralId: referral.id,
        error: err,
      });
    }
  }

  log.info('RED referral created successfully', {
    referralId: referral.id,
    screeningId,
    status: 'PENDING',
    slaDeadlineAt,
  });
}

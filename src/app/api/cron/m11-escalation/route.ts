/**
 * src/app/api/cron/m11-escalation/route.ts
 * NAWASENA M11 — GET: Hourly escalation cron for overdue MH referrals.
 *
 * Schedule: "0 * * * *" (every hour)
 * Auth: verifyCronAuth (CRON_SECRET bearer token)
 *
 * Logic:
 *   - Find PENDING referrals past slaDeadlineAt that haven't been escalated
 *   - Mark escalatedAt = now, append ESCALATED timeline entry
 *   - Notify all Poli Psikologi coordinators (CRITICAL)
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { prisma } from '@/utils/prisma';
import { sendNotification } from '@/lib/notifications/send';
import { createLogger } from '@/lib/logger';
import type { NotificationCategory } from '@prisma/client';

const log = createLogger('cron-m11-escalation');

export const GET = createApiHandler({
  handler: async (req, ctx) => {
    await verifyCronAuth(req);
    const now = new Date();

    ctx.log.info('M11 escalation cron triggered', { now: now.toISOString() });

    // Find PENDING referrals past SLA deadline that haven't been escalated
    const overdueReferrals = await prisma.mHReferralLog.findMany({
      where: {
        status: 'PENDING',
        slaDeadlineAt: { lt: now },
        escalatedAt: null,
      },
      select: { id: true, referredToId: true, userId: true, organizationId: true },
    });

    ctx.log.info('Found overdue referrals', { count: overdueReferrals.length });

    // Find all Poli Psikologi coordinators
    const coordinators = await prisma.user.findMany({
      where: { isPoliPsikologiCoord: true },
      select: { id: true },
    });

    ctx.log.info('Found Poli Psikologi coordinators', { count: coordinators.length });

    let escalated = 0;
    for (const ref of overdueReferrals) {
      try {
        // Mark escalated and append timeline in a single transaction
        await prisma.$transaction(async (tx) => {
          await tx.mHReferralLog.update({
            where: { id: ref.id },
            data: { escalatedAt: now },
          });

          await tx.mHReferralTimeline.create({
            data: {
              referralId: ref.id,
              actorId: 'system',
              action: 'ESCALATED',
              metadata: { escalatedAt: now.toISOString(), reason: 'SLA_EXCEEDED' },
            },
          });
        });

        // Notify all Poli Psikologi coordinators (outside tx — non-fatal)
        for (const coord of coordinators) {
          try {
            await sendNotification({
              userId: coord.id,
              templateKey: 'MH_ESCALATION_COORDINATOR',
              payload: {
                referralId: ref.id,
                originalSACId: ref.referredToId,
                escalatedAt: now.toISOString(),
              },
              category: 'CRITICAL' as NotificationCategory,
            });
          } catch (err) {
            log.warn('Failed to send escalation notification', { referralId: ref.id, coordId: coord.id, error: err });
          }
        }

        escalated++;
        log.info('Referral escalated', { referralId: ref.id });
      } catch (err) {
        log.error('Failed to escalate referral', { referralId: ref.id, error: err });
      }
    }

    log.info('Escalation cron complete', { escalated, total: overdueReferrals.length });
    ctx.log.info('M11 escalation cron complete', { escalated, total: overdueReferrals.length });

    return ApiResponse.success({ escalated, total: overdueReferrals.length });
  },
});

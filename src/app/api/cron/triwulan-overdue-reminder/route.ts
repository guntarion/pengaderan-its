/**
 * src/app/api/cron/triwulan-overdue-reminder/route.ts
 * NAWASENA M14 — Daily cron: send overdue reminders for triwulan reviews.
 *
 * Logic:
 *   - Reviews in DRAFT > 3 days since generated → OPS reminder to SC
 *   - Reviews in SUBMITTED_FOR_PEMBINA > 3 days → OPS reminder to Pembina
 *   - Reviews stuck > 14 days → CRITICAL escalation to BLM + SUPERADMIN
 *
 * Schedule: 0 2 * * * (09:00 WIB = 02:00 UTC)
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { ReviewStatus } from '@prisma/client';
import { NotificationCategory, ChannelType, LogStatus, UserStatus } from '@prisma/client';

const log = createLogger('m14/cron/overdue-reminder');

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_THRESHOLD_DAYS = 3;
const CRITICAL_THRESHOLD_DAYS = 14;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    log.warn('Unauthorized overdue-reminder cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestId = `cron-overdue-${Date.now()}`;
  log.info('Triwulan overdue reminder cron triggered', { requestId });

  const now = new Date();
  const reminderCutoff = new Date(now.getTime() - REMINDER_THRESHOLD_DAYS * DAY_MS);
  const criticalCutoff = new Date(now.getTime() - CRITICAL_THRESHOLD_DAYS * DAY_MS);

  let reminderCount = 0;
  let criticalCount = 0;

  try {
    // Find overdue DRAFT reviews
    const overdueReviews = await prisma.triwulanReview.findMany({
      where: {
        status: {
          in: [ReviewStatus.DRAFT, ReviewStatus.SUBMITTED_FOR_PEMBINA],
        },
        supersededByReviewId: null,
        updatedAt: { lte: reminderCutoff },
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        organizationId: true,
        quarterNumber: true,
        cohortId: true,
      },
    });

    log.info('Found overdue reviews', { count: overdueReviews.length });

    // Find SUPERADMIN for each org to notify
    for (const review of overdueReviews) {
      const daysStuck = Math.floor((now.getTime() - review.updatedAt.getTime()) / DAY_MS);
      const isCritical = review.updatedAt <= criticalCutoff;

      // Get users to notify
      const usersToNotify = await prisma.user.findMany({
        where: {
          organizationId: review.organizationId,
          role: isCritical
            ? { in: ['BLM', 'SUPERADMIN'] }
            : review.status === ReviewStatus.DRAFT
            ? { in: ['SC', 'SUPERADMIN'] }
            : { in: ['PEMBINA', 'SUPERADMIN'] },
          status: UserStatus.ACTIVE,
        },
        select: { id: true },
        take: 10,
      });

      if (usersToNotify.length === 0) continue;

      // Get template (best effort — skip if not found)
      const templateKey = isCritical
        ? 'TRIWULAN_OVERDUE_CRITICAL'
        : 'TRIWULAN_OVERDUE_REMINDER';

      const template = await prisma.notificationTemplate.findFirst({
        where: { templateKey },
        include: { activeVersion: true },
      });

      if (!template?.activeVersion) {
        log.warn('Notification template not found', { templateKey });
        continue;
      }

      // Create notification logs
      for (const user of usersToNotify) {
        try {
          await prisma.notificationLog.create({
            data: {
              organizationId: review.organizationId,
              userId: user.id,
              templateKey,
              templateVersionId: template.activeVersion.id,
              channel: ChannelType.IN_APP,
              category: isCritical ? NotificationCategory.CRITICAL : NotificationCategory.OPS,
              status: LogStatus.QUEUED,
              metadata: {
                reviewId: review.id,
                quarterNumber: review.quarterNumber,
                status: review.status,
                daysStuck,
              },
            },
          });

          if (isCritical) {
            criticalCount++;
          } else {
            reminderCount++;
          }
        } catch (err) {
          log.error('Failed to create notification for overdue review', {
            error: err,
            reviewId: review.id,
            userId: user.id,
          });
        }
      }
    }

    log.info('Overdue reminder cron completed', {
      requestId,
      reminderCount,
      criticalCount,
      reviewsChecked: overdueReviews.length,
    });

    return NextResponse.json({
      ok: true,
      reviewsChecked: overdueReviews.length,
      reminderCount,
      criticalCount,
    });
  } catch (err) {
    log.error('Overdue reminder cron failed', { error: err, requestId });
    return NextResponse.json({ error: 'Cron failed', detail: String(err) }, { status: 500 });
  }
}

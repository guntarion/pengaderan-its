/**
 * src/app/api/cron/m04-red-flag-escalate/route.ts
 * NAWASENA M04 — Red-flag escalation cron.
 *
 * Schedule (UTC): 0 * /6 * * * (every 6 hours)
 * Finds RedFlagEvents with status=ACTIVE and triggeredAt < now - 48h.
 * Escalates them to ESCALATED status and audits the action.
 * Attempts to notify via M15 sendNotification (logs warning if unavailable).
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { AuditAction } from '@prisma/client';

export const GET = createApiHandler({
  auth: false,
  handler: async (req, { log }) => {
    verifyCronAuth(req);

    log.info('M04 red-flag escalate cron started');

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Find active red-flag events older than 48h
    const staleEvents = await prisma.redFlagEvent.findMany({
      where: {
        status: 'ACTIVE',
        triggeredAt: { lt: fortyEightHoursAgo },
      },
      select: {
        id: true,
        organizationId: true,
        subjectUserId: true,
        notifiedUserId: true,
        cohortId: true,
        triggeredAt: true,
      },
    });

    log.info('Red-flag escalate: found stale events', { count: staleEvents.length });

    if (staleEvents.length === 0) {
      return ApiResponse.success({ escalated: 0 });
    }

    const staleEventIds = staleEvents.map((e) => e.id);

    // Escalate all stale events
    await prisma.redFlagEvent.updateMany({
      where: { id: { in: staleEventIds } },
      data: { status: 'ESCALATED' },
    });

    // Try to notify via M15 sendNotification
    try {
      const { sendNotification } = await import('@/lib/notifications/send');
      for (const event of staleEvents) {
        if (event.notifiedUserId) {
          await sendNotification({
            userId: event.notifiedUserId,
            templateKey: 'RED_FLAG_ESCALATED',
            category: 'CRITICAL' as import('@prisma/client').NotificationCategory,
            payload: {
              redFlagEventId: event.id,
              subjectUserId: event.subjectUserId,
              escalatedAt: new Date().toISOString(),
            },
          }).catch((err: unknown) => {
            log.warn('Failed to send escalation notification', {
              eventId: event.id,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      }
    } catch {
      log.warn('M15 sendNotification not available — skipping escalation notifications');
    }

    // Audit log
    await prisma.nawasenaAuditLog.create({
      data: {
        action: AuditAction.RED_FLAG_ESCALATE,
        entityType: 'RedFlagEvent',
        entityId: 'cron-batch',
        metadata: {
          escalatedCount: staleEvents.length,
          escalatedEventIds: staleEventIds,
          cutoffDate: fortyEightHoursAgo.toISOString(),
        },
      },
    });

    log.info('Red-flag escalate complete', { escalated: staleEvents.length });

    return ApiResponse.success({ escalated: staleEvents.length });
  },
});

/**
 * src/lib/event-execution/notif/batch-send.ts
 * NAWASENA M08 — Chunked batch notification sender.
 *
 * Sends notifications to many users in chunks of 50.
 * Captures failures and increments notificationFailedCount.
 */

import { prisma } from '@/utils/prisma';
import { sendNotification } from '@/lib/notifications/send';
import { createLogger } from '@/lib/logger';
import type { NotificationCategory } from '@prisma/client';

const log = createLogger('event-execution:batch-send');

const CHUNK_SIZE = 50;

export interface BatchSendResult {
  total: number;
  success: number;
  failed: number;
}

/**
 * Send a notification template to a list of users in chunks.
 */
export async function batchSendNotification(
  userIds: string[],
  templateKey: string,
  payload: Record<string, unknown>,
  instanceId: string,
): Promise<BatchSendResult> {
  log.info('Starting batch notification', { templateKey, total: userIds.length });

  let success = 0;
  let failed = 0;

  for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + CHUNK_SIZE);

    const results = await Promise.allSettled(
      chunk.map((userId) =>
        sendNotification({
          userId,
          templateKey,
          payload,
          category: 'OPS' as NotificationCategory,
        }),
      ),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        success++;
      } else {
        failed++;
        log.warn('Notification failed for user in batch', { error: result.reason });
      }
    }
  }

  if (failed > 0) {
    // Increment notificationFailedCount on instance
    try {
      await prisma.kegiatanInstance.update({
        where: { id: instanceId },
        data: { notificationFailedCount: { increment: failed } },
      });
    } catch (err) {
      log.error('Failed to update notificationFailedCount', { error: err });
    }
  }

  log.info('Batch notification complete', { templateKey, success, failed });

  return { total: userIds.length, success, failed };
}

/**
 * Get all CONFIRMED RSVP user IDs for an instance.
 */
export async function getConfirmedRsvpUserIds(
  instanceId: string,
  organizationId: string,
): Promise<string[]> {
  const rsvps = await prisma.rSVP.findMany({
    where: { instanceId, organizationId, status: 'CONFIRMED' },
    select: { userId: true },
  });
  return rsvps.map((r) => r.userId);
}

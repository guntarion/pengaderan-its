/**
 * src/lib/event/broadcast.ts
 * NAWASENA M06 — Event cancellation broadcast helper.
 *
 * Called when an instance is cancelled (M08 action) to notify all RSVP holders.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('event:broadcast');

/**
 * Broadcast EVENT_CANCELLED notification to all CONFIRMED/WAITLIST RSVP holders.
 * Sends in parallel batches of 50.
 */
export async function broadcastCancellation(
  instanceId: string,
  reason?: string,
): Promise<{ notified: number }> {
  log.info('Broadcasting cancellation', { instanceId });

  // Get all CONFIRMED + WAITLIST RSVPs
  const rsvps = await prisma.rSVP.findMany({
    where: {
      instanceId,
      status: { in: ['CONFIRMED', 'WAITLIST'] },
    },
    select: { userId: true, id: true },
  });

  if (rsvps.length === 0) {
    log.info('No RSVP holders to notify', { instanceId });
    return { notified: 0 };
  }

  const { sendNotification } = await import('@/lib/notifications/send');
  let notified = 0;

  const BATCH_SIZE = 50;
  for (let i = 0; i < rsvps.length; i += BATCH_SIZE) {
    const batch = rsvps.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((rsvp) =>
        sendNotification({
          userId: rsvp.userId,
          templateKey: 'EVENT_CANCELLED',
          payload: { instanceId, reason: reason ?? 'Kegiatan dibatalkan.' },
          category: 'NORMAL',
        }),
      ),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') notified++;
      else log.warn('Failed to send cancellation notification', { error: result.reason });
    }
  }

  log.info('Cancellation broadcast complete', { instanceId, notified, total: rsvps.length });
  return { notified };
}

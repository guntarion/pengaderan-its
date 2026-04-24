/**
 * src/lib/notifications/channels/push.ts
 * NAWASENA M15 — Web Push notification channel using web-push (VAPID).
 *
 * Requires: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 */

import type {
  NotificationChannel,
  ChannelTarget,
  ChannelResult,
  RenderedTemplate,
  SendContext,
  UserPreferences,
  PushTarget,
} from '../types';
import type { ChannelType } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import { prisma } from '@/utils/prisma';

const log = createLogger('notifications:push-channel');

// Lazy-load web-push to avoid initialization on import if VAPID keys are missing
let webpushInitialized = false;

async function getWebPush() {
  const webpush = await import('web-push');
  if (!webpushInitialized) {
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!subject || !publicKey || !privateKey) {
      throw new Error('VAPID keys not configured. Set VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY in env.');
    }

    webpush.default.setVapidDetails(subject, publicKey, privateKey);
    webpushInitialized = true;
    log.debug('VAPID initialized');
  }
  return webpush.default;
}

export class PushChannel implements NotificationChannel {
  readonly type: ChannelType = 'PUSH';

  async isAvailable(userId: string, prefs: UserPreferences): Promise<boolean> {
    if (!prefs.pushEnabled) return false;

    // Check if user has any active push subscriptions
    const count = await prisma.notificationSubscription.count({
      where: { userId, status: 'ACTIVE' },
    });

    return count > 0;
  }

  async send(
    target: ChannelTarget,
    rendered: RenderedTemplate,
    ctx: SendContext,
  ): Promise<ChannelResult> {
    if (target.type !== 'PUSH') {
      return {
        status: 'FAILED',
        error: `Invalid target type ${target.type} for PushChannel`,
      };
    }

    const pushTarget = target as PushTarget;

    if (!rendered.push) {
      return {
        status: 'FAILED',
        error: 'No push content in rendered template',
      };
    }

    if (pushTarget.subscriptions.length === 0) {
      return {
        status: 'SKIPPED_NO_SUBSCRIPTION',
        skippedReason: 'No active push subscriptions for user',
      };
    }

    let webpush;
    try {
      webpush = await getWebPush();
    } catch (err) {
      ctx.log.error('Failed to initialize web-push (VAPID keys missing)', { error: err });
      return {
        status: 'FAILED',
        error: 'VAPID not configured',
      };
    }

    const pushPayload = JSON.stringify({
      title: rendered.push.title,
      body: rendered.push.body,
      icon: rendered.push.icon ?? '/icon-192x192.png',
      badge: '/badge-96x96.png',
      data: {
        url: rendered.push.url ?? '/',
        templateKey: rendered.templateKey,
        category: ctx.category,
      },
      tag: rendered.push.tag ?? rendered.templateKey,
      renotify: ctx.category === 'CRITICAL', // Always show CRITICAL even if previous exists
    });

    const subscriptionResults: ChannelResult['subscriptions'] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const sub of pushTarget.subscriptions) {
      try {
        const response = await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload,
        );

        subscriptionResults.push({
          subscriptionId: sub.id,
          status: 'SENT',
          providerMessageId: response.headers?.['x-request-id'] as string | undefined,
        });
        sentCount++;

        // Update lastUsedAt
        await prisma.notificationSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        });
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;

        if (statusCode === 410) {
          // Subscription expired — mark as EXPIRED
          log.info('Push subscription expired (410 Gone), marking EXPIRED', {
            subscriptionId: sub.id,
            userId: pushTarget.userId,
          });

          await prisma.notificationSubscription.update({
            where: { id: sub.id },
            data: { status: 'EXPIRED', lastErrorAt: new Date() },
          });

          subscriptionResults.push({
            subscriptionId: sub.id,
            status: 'EXPIRED',
            error: '410 Gone — subscription expired',
          });
        } else {
          log.error('Push send failed', {
            subscriptionId: sub.id,
            userId: pushTarget.userId,
            statusCode,
            error: err,
          });

          await prisma.notificationSubscription.update({
            where: { id: sub.id },
            data: { lastErrorAt: new Date() },
          });

          subscriptionResults.push({
            subscriptionId: sub.id,
            status: 'FAILED',
            error: `HTTP ${statusCode}: ${(err as Error).message}`,
          });
          failedCount++;
        }
      }
    }

    ctx.log.info('Push channel send complete', {
      userId: pushTarget.userId,
      total: pushTarget.subscriptions.length,
      sent: sentCount,
      failed: failedCount,
    });

    if (sentCount === 0 && failedCount === 0) {
      // All expired
      return { status: 'SKIPPED_NO_SUBSCRIPTION', subscriptions: subscriptionResults };
    }

    if (sentCount === 0) {
      return { status: 'FAILED', subscriptions: subscriptionResults, error: 'All push subscriptions failed' };
    }

    if (failedCount > 0) {
      return { status: 'PARTIAL', subscriptions: subscriptionResults };
    }

    return { status: 'SENT', subscriptions: subscriptionResults };
  }
}

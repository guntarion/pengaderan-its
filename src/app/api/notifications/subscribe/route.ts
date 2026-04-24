/**
 * src/app/api/notifications/subscribe/route.ts
 * NAWASENA M15 — Web Push Subscription Registration
 *
 * POST /api/notifications/subscribe
 * Authenticated: any logged-in user
 *
 * Registers a Web Push subscription (endpoint + keys) for the current user.
 * Idempotent: upserts based on (userId, endpoint) unique constraint.
 * Creates NotificationPreference if not exists.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const subscribeSchema = z.object({
  endpoint: z.string().url('Push endpoint must be a valid URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
  userAgent: z.string().max(500).optional(),
});

export const POST = createApiHandler({
  auth: true,
  handler: async (req, ctx) => {
    const body = await validateBody(req, subscribeSchema);

    ctx.log.info('Registering push subscription', {
      userId: ctx.user!.id,
      endpoint: body.endpoint.substring(0, 50) + '...',
    });

    // Ensure NotificationPreference exists
    const existingPref = await prisma.notificationPreference.findUnique({
      where: { userId: ctx.user!.id },
    });

    if (!existingPref) {
      await prisma.notificationPreference.create({
        data: {
          userId: ctx.user!.id,
          organizationId: ctx.user!.organizationId!,
          pushEnabled: true,
          emailEnabled: true,
          whatsappEnabled: false,
          digestMode: 'IMMEDIATE',
          unsubscribeToken: randomUUID(),
        },
      });
      ctx.log.info('Created default NotificationPreference for user', {
        userId: ctx.user!.id,
      });
    }

    // Upsert subscription (idempotent)
    const subscription = await prisma.notificationSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: ctx.user!.id,
          endpoint: body.endpoint,
        },
      },
      update: {
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent,
        status: 'ACTIVE',
        lastUsedAt: new Date(),
      },
      create: {
        userId: ctx.user!.id,
        organizationId: ctx.user!.organizationId!,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent,
        status: 'ACTIVE',
        lastUsedAt: new Date(),
      },
      select: { id: true, status: true, createdAt: true },
    });

    ctx.log.info('Push subscription registered', {
      subscriptionId: subscription.id,
      userId: ctx.user!.id,
    });

    return ApiResponse.success({ subscriptionId: subscription.id, status: subscription.status });
  },
});

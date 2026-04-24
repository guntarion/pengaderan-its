/**
 * src/app/api/notifications/unsubscribe/route.ts
 * NAWASENA M15 — Push Subscription Unsubscribe
 *
 * POST /api/notifications/unsubscribe (authenticated — revoke specific subscription)
 * GET  /api/notifications/unsubscribe?token=<unsubscribeToken> (email unsubscribe link)
 *
 * The GET variant handles one-click unsubscribe links from email footers.
 * Sets pushEnabled=false and emailEnabled=false in NotificationPreference.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateQuery } from '@/lib/api';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const unsubscribeBodySchema = z.object({
  endpoint: z.string().url().optional(),
  all: z.boolean().optional(),
});

const tokenQuerySchema = z.object({
  token: z.string().min(1),
});

// POST — authenticated, revokes subscription(s)
export const POST = createApiHandler({
  auth: true,
  handler: async (req, ctx) => {
    const body = await validateBody(req, unsubscribeBodySchema);

    if (body.endpoint) {
      // Revoke specific subscription by endpoint
      const result = await prisma.notificationSubscription.updateMany({
        where: {
          userId: ctx.user!.id,
          endpoint: body.endpoint,
        },
        data: { status: 'REVOKED' },
      });

      ctx.log.info('Revoked push subscription by endpoint', {
        userId: ctx.user!.id,
        count: result.count,
      });

      return ApiResponse.success({ revokedCount: result.count });
    }

    if (body.all) {
      // Revoke all subscriptions for this user
      const result = await prisma.notificationSubscription.updateMany({
        where: {
          userId: ctx.user!.id,
          status: 'ACTIVE',
        },
        data: { status: 'REVOKED' },
      });

      // Also update preference to disable push
      await prisma.notificationPreference.updateMany({
        where: { userId: ctx.user!.id },
        data: { pushEnabled: false },
      });

      ctx.log.info('Revoked all push subscriptions for user', {
        userId: ctx.user!.id,
        count: result.count,
      });

      return ApiResponse.success({ revokedCount: result.count });
    }

    return ApiResponse.success({ revokedCount: 0, message: 'No action taken' });
  },
});

// GET — unauthenticated one-click unsubscribe via token in email footer
export async function GET(request: NextRequest) {
  try {
    const query = validateQuery(request, tokenQuerySchema);
    const { token } = query;

    const pref = await prisma.notificationPreference.findUnique({
      where: { unsubscribeToken: token },
      select: { userId: true },
    });

    if (!pref) {
      return ApiResponse.success({
        success: false,
        message: 'Invalid or expired unsubscribe token',
      });
    }

    // Disable email + push notifications
    await prisma.notificationPreference.update({
      where: { unsubscribeToken: token },
      data: {
        emailEnabled: false,
        pushEnabled: false,
      },
    });

    // Revoke all active subscriptions
    await prisma.notificationSubscription.updateMany({
      where: { userId: pref.userId, status: 'ACTIVE' },
      data: { status: 'REVOKED' },
    });

    return ApiResponse.success({
      success: true,
      message: 'Berhasil berhenti berlangganan notifikasi. Anda tidak akan menerima notifikasi lebih lanjut.',
    });
  } catch {
    return ApiResponse.success({
      success: false,
      message: 'Gagal memproses permintaan berhenti berlangganan.',
    });
  }
}

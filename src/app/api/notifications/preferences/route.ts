/**
 * src/app/api/notifications/preferences/route.ts
 * NAWASENA M15 — Notification Preferences
 *
 * GET /api/notifications/preferences — get current user's preferences
 * PUT /api/notifications/preferences — update current user's preferences
 *
 * CRITICAL channels (CRITICAL category) cannot be fully disabled by users.
 * The UI should display a disclaimer that CRITICAL notifications are always sent.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const updatePreferenceSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  digestMode: z.enum(['IMMEDIATE', 'DAILY_DIGEST', 'WEEKLY_DIGEST']).optional(),
});

export const GET = createApiHandler({
  auth: true,
  handler: async (req, ctx) => {
    ctx.log.debug('Fetching notification preferences', { userId: ctx.user!.id });

    let pref = await prisma.notificationPreference.findUnique({
      where: { userId: ctx.user!.id },
      select: {
        pushEnabled: true,
        emailEnabled: true,
        whatsappEnabled: true,
        digestMode: true,
        emailBouncedAt: true,
        unsubscribeToken: true,
        updatedAt: true,
      },
    });

    if (!pref) {
      // Create default preference on first access
      pref = await prisma.notificationPreference.create({
        data: {
          userId: ctx.user!.id,
          organizationId: ctx.user!.organizationId!,
          pushEnabled: true,
          emailEnabled: true,
          whatsappEnabled: false,
          digestMode: 'IMMEDIATE',
          unsubscribeToken: randomUUID(),
        },
        select: {
          pushEnabled: true,
          emailEnabled: true,
          whatsappEnabled: true,
          digestMode: true,
          emailBouncedAt: true,
          unsubscribeToken: true,
          updatedAt: true,
        },
      });
    }

    return ApiResponse.success(pref);
  },
});

export const PUT = createApiHandler({
  auth: true,
  handler: async (req, ctx) => {
    const body = await validateBody(req, updatePreferenceSchema);

    ctx.log.info('Updating notification preferences', {
      userId: ctx.user!.id,
      changes: body,
    });

    const oldPref = await prisma.notificationPreference.findUnique({
      where: { userId: ctx.user!.id },
    });

    // Ensure preference record exists
    const pref = await prisma.notificationPreference.upsert({
      where: { userId: ctx.user!.id },
      create: {
        userId: ctx.user!.id,
        organizationId: ctx.user!.organizationId!,
        pushEnabled: body.pushEnabled ?? true,
        emailEnabled: body.emailEnabled ?? true,
        whatsappEnabled: body.whatsappEnabled ?? false,
        digestMode: body.digestMode ?? 'IMMEDIATE',
        unsubscribeToken: randomUUID(),
      },
      update: {
        ...(body.pushEnabled !== undefined && { pushEnabled: body.pushEnabled }),
        ...(body.emailEnabled !== undefined && { emailEnabled: body.emailEnabled }),
        ...(body.whatsappEnabled !== undefined && { whatsappEnabled: body.whatsappEnabled }),
        ...(body.digestMode !== undefined && { digestMode: body.digestMode }),
      },
      select: {
        pushEnabled: true,
        emailEnabled: true,
        whatsappEnabled: true,
        digestMode: true,
        emailBouncedAt: true,
        unsubscribeToken: true,
        updatedAt: true,
      },
    });

    await auditLog.fromContext(
      ctx,
      {
        action: AUDIT_ACTIONS.NOTIFICATION_PREFERENCE_UPDATE,
        resource: 'notification_preference',
        resourceId: ctx.user!.id,
        oldValue: oldPref
          ? {
              pushEnabled: oldPref.pushEnabled,
              emailEnabled: oldPref.emailEnabled,
              whatsappEnabled: oldPref.whatsappEnabled,
              digestMode: oldPref.digestMode,
            }
          : null,
        newValue: body,
      },
      req,
    );

    ctx.log.info('Notification preferences updated', { userId: ctx.user!.id });

    return ApiResponse.success(pref);
  },
});

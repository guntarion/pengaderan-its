/**
 * src/app/api/pulse/route.ts
 * NAWASENA M04 — Pulse Harian API.
 *
 * POST /api/pulse — Submit a single pulse (authenticated Maba).
 * GET  /api/pulse — Get today's pulse for the current user.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { createPulse, getTodayPulse, getOrgTimezoneByOrgId } from '@/lib/pulse/service';
import { invalidateAggregateCache } from '@/lib/mood-aggregate/service';
import { resolveKPForMaba } from '@/lib/kp-group-resolver/resolve-kp-for-maba';
import { checkAndTrigger } from '@/lib/pulse/red-flag-engine';
import { AuditAction } from '@prisma/client';

const submitPulseSchema = z.object({
  mood: z.number().int().min(1).max(5),
  emoji: z.string().min(1).max(10),
  comment: z.string().max(500).optional().nullable(),
  recordedAt: z.string().datetime({ offset: true }),
  clientTempId: z.string().optional().nullable(),
  cohortId: z.string().min(1),
});

/**
 * POST /api/pulse
 * Submit a single pulse check-in.
 */
export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, submitPulseSchema);

    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const timezone = await getOrgTimezoneByOrgId(user.organizationId);

    const pulse = await createPulse({
      userId: user.id,
      organizationId: user.organizationId,
      cohortId: body.cohortId,
      mood: body.mood,
      emoji: body.emoji,
      comment: body.comment ?? null,
      recordedAt: new Date(body.recordedAt),
      clientTempId: body.clientTempId ?? null,
      timezone,
    });

    log.info('Pulse submitted', { pulseId: pulse.id, mood: pulse.mood });

    // Audit log
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: user.organizationId,
        action: AuditAction.PULSE_SUBMIT,
        actorUserId: user.id,
        subjectUserId: user.id,
        entityType: 'PulseCheck',
        entityId: pulse.id,
        metadata: { mood: pulse.mood, emoji: pulse.emoji },
      },
    });

    // Invalidate KP mood aggregate cache (non-blocking)
    resolveKPForMaba(user.id, body.cohortId)
      .then((kpInfo) => {
        if (kpInfo) {
          return invalidateAggregateCache(kpInfo.kpGroupId, timezone);
        }
      })
      .catch((err) => log.warn('Failed to invalidate mood aggregate cache', { error: err }));

    // Red-flag engine (non-blocking, after response)
    checkAndTrigger(user.id, user.organizationId, body.cohortId, pulse.id).catch((err) =>
      log.warn('Red-flag engine error', { error: err }),
    );

    return ApiResponse.success(pulse, 201);
  },
});

/**
 * GET /api/pulse
 * Get today's pulse for the current user.
 */
export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const timezone = await getOrgTimezoneByOrgId(user.organizationId);
    const todayPulse = await getTodayPulse(user.id, timezone);

    log.info('Today pulse fetched', { userId: user.id, hasSubmitted: Boolean(todayPulse) });

    return ApiResponse.success({
      submitted: Boolean(todayPulse),
      pulse: todayPulse,
    });
  },
});

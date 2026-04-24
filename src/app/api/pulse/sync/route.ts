/**
 * src/app/api/pulse/sync/route.ts
 * NAWASENA M04 — Pulse bulk sync endpoint.
 *
 * POST /api/pulse/sync — Bulk sync offline queue (max 30 items).
 * Called by Service Worker background sync or offline queue client.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { bulkSyncPulse } from '@/lib/pulse/service';
import { AuditAction } from '@prisma/client';

const syncItemSchema = z.object({
  clientTempId: z.string().min(1),
  mood: z.number().int().min(1).max(5),
  emoji: z.string().min(1).max(10),
  comment: z.string().max(500).optional().nullable(),
  recordedAt: z.string().datetime({ offset: true }),
  cohortId: z.string().min(1),
  timezone: z.string().optional(),
});

const bulkSyncSchema = z.object({
  items: z.array(syncItemSchema).min(1).max(30),
});

/**
 * POST /api/pulse/sync
 * Bulk sync offline-queued pulses.
 * Returns per-item status for the client to update its queue.
 */
export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const { items } = await validateBody(req, bulkSyncSchema);

    log.info('Bulk pulse sync request', { userId: user.id, count: items.length });

    const syncItems = items.map((item) => ({
      userId: user.id,
      organizationId: user.organizationId!,
      cohortId: item.cohortId,
      mood: item.mood,
      emoji: item.emoji,
      comment: item.comment ?? null,
      recordedAt: new Date(item.recordedAt),
      clientTempId: item.clientTempId,
      timezone: item.timezone,
    }));

    const results = await bulkSyncPulse(syncItems);

    const syncedCount = results.filter((r) => r.status === 'OK').length;

    // Audit log for bulk sync
    if (syncedCount > 0) {
      await prisma.nawasenaAuditLog.create({
        data: {
          organizationId: user.organizationId,
          action: AuditAction.PULSE_SYNC_BULK,
          actorUserId: user.id,
          subjectUserId: user.id,
          entityType: 'PulseCheck',
          entityId: user.id,
          metadata: {
            totalItems: items.length,
            syncedCount,
            duplicateCount: results.filter((r) => r.status === 'DUPLICATE').length,
            rejectedCount: results.filter((r) => r.status === 'REJECTED_TOO_OLD').length,
          },
        },
      });
    }

    log.info('Bulk sync complete', { userId: user.id, syncedCount, total: items.length });

    return ApiResponse.success({ results });
  },
});

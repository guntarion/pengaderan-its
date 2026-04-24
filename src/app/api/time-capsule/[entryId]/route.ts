/**
 * src/app/api/time-capsule/[entryId]/route.ts
 * NAWASENA M07 — Time Capsule entry GET + PATCH.
 *
 * GET   /api/time-capsule/[entryId] — get entry (owner or Kasuh with share)
 * PATCH /api/time-capsule/[entryId] — update entry (within 24h, owner only)
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateBody,
  validateParams,
  NotFoundError,
  ForbiddenError,
} from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { getEntryById, updateEntry } from '@/lib/time-capsule/service';
import { z } from 'zod';

const entryParamSchema = z.object({ entryId: z.string().min(1) });

const updateEntrySchema = z.object({
  title: z.string().max(120).optional(),
  body: z.string().min(1).max(10000).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  sharedWithKasuh: z.boolean().optional(),
});

// ── GET /api/time-capsule/[entryId] ─────────────────────────────────────

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log: ctx }) => {
    const { entryId } = validateParams(params, entryParamSchema);

    ctx.info('Fetching Time Capsule entry', { entryId, userId: user.id });

    const entry = await getEntryById(entryId, { id: user.id, role: user.role });

    return ApiResponse.success(entry);
  },
});

// ── PATCH /api/time-capsule/[entryId] ───────────────────────────────────

export const PATCH = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log: ctx }) => {
    const { entryId } = validateParams(params, entryParamSchema);
    const data = await validateBody(req, updateEntrySchema);

    ctx.info('Updating Time Capsule entry', { entryId, userId: user.id });

    // Verify ownership first
    const existing = await prisma.timeCapsuleEntry.findUnique({
      where: { id: entryId },
      select: { userId: true, cohortId: true },
    });

    if (!existing) throw NotFoundError('Time Capsule Entry');
    if (existing.userId !== user.id) throw ForbiddenError('Hanya pemilik yang dapat mengedit entry ini');

    const updated = await updateEntry(entryId, user.id, existing.cohortId, data);

    // Audit log
    await auditLog.record({
      userId: user.id,
      action: 'TIME_CAPSULE_ENTRY_UPDATE' as Parameters<typeof auditLog.record>[0]['action'],
      resource: 'TimeCapsuleEntry',
      resourceId: entryId,
      newValue: data,
      request: req,
    });

    ctx.info('Time Capsule entry updated', { entryId });

    return ApiResponse.success(updated);
  },
});

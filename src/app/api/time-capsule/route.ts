/**
 * src/app/api/time-capsule/route.ts
 * NAWASENA M07 — Time Capsule entry list + create.
 *
 * GET  /api/time-capsule — list own entries (paginated + filtered)
 * POST /api/time-capsule — create new published entry
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateQuery } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { createEntry, listForUser } from '@/lib/time-capsule/service';
import { z } from 'zod';

// ── Validation schemas ───────────────────────────────────────────────────

const createEntrySchema = z.object({
  title: z.string().max(120).optional(),
  body: z.string().min(1).max(10000, 'Konten terlalu panjang (maks 10.000 karakter)'),
  mood: z.number().int().min(1).max(5).optional(),
  sharedWithKasuh: z.boolean().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  mood: z.coerce.number().int().min(1).max(5).optional(),
  sharedWithKasuh: z.enum(['true', 'false']).optional(),
  search: z.string().max(200).optional(),
});

// ── GET /api/time-capsule ────────────────────────────────────────────────

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log: ctx }) => {
    const query = validateQuery(req, listQuerySchema);

    ctx.info('Listing Time Capsule entries', { userId: user.id });

    // Get user's cohortId
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { currentCohortId: true },
    });

    if (!userRecord?.currentCohortId) {
      return ApiResponse.success({ entries: [], total: 0, page: 1, limit: query.limit });
    }

    const result = await listForUser(user.id, userRecord.currentCohortId, {
      mood: query.mood,
      sharedWithKasuh: query.sharedWithKasuh === 'true' ? true : query.sharedWithKasuh === 'false' ? false : undefined,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    return ApiResponse.paginated(result.entries, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  },
});

// ── POST /api/time-capsule ───────────────────────────────────────────────

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log: ctx }) => {
    const data = await validateBody(req, createEntrySchema);

    ctx.info('Creating Time Capsule entry', { userId: user.id });

    // Get user's org + cohort
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true, currentCohortId: true, timeCapsuleShareDefault: true },
    });

    if (!userRecord?.currentCohortId) {
      throw new Error('User tidak terdaftar dalam cohort aktif');
    }

    // Apply global share default if not specified
    const sharedWithKasuh = data.sharedWithKasuh ?? userRecord.timeCapsuleShareDefault;

    const entry = await createEntry(user.id, userRecord.currentCohortId, userRecord.organizationId, {
      ...data,
      sharedWithKasuh,
    });

    // Audit log
    await auditLog.record({
      userId: user.id,
      action: 'TIME_CAPSULE_ENTRY_CREATE' as Parameters<typeof auditLog.record>[0]['action'],
      resource: 'TimeCapsuleEntry',
      resourceId: entry.id,
      newValue: { title: entry.title, mood: entry.mood, sharedWithKasuh: entry.sharedWithKasuh },
      request: req,
    });

    ctx.info('Time Capsule entry created', { entryId: entry.id });

    return ApiResponse.success(entry, 201);
  },
});

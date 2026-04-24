/**
 * src/app/api/rubric-score/lock/[journalId]/route.ts
 * NAWASENA M04 — Redis lock for rubric scoring.
 *
 * POST   /api/rubric-score/lock/[journalId] — Acquire lock.
 * PUT    /api/rubric-score/lock/[journalId] — Heartbeat (refresh TTL).
 * DELETE /api/rubric-score/lock/[journalId] — Release lock.
 */

import { createApiHandler, ApiResponse, validateParams, ConflictError, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { acquireLock, heartbeat, releaseLock } from '@/lib/rubric/lock';

const paramsSchema = z.object({
  journalId: z.string().min(1),
});

/**
 * POST /api/rubric-score/lock/[journalId]
 * Acquire scoring lock. Returns 409 if already locked by another user.
 */
export const POST = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    const { journalId } = validateParams(params, paramsSchema);

    log.info('Acquiring rubric lock', { journalId, userId: user.id });

    const result = await acquireLock(journalId, user.id);

    if (!result.acquired) {
      log.warn('Lock acquisition failed — already locked', {
        journalId,
        userId: user.id,
        lockedBy: result.lockedByUserId,
      });
      throw ConflictError('Journal is being scored by another user');
    }

    log.info('Rubric lock acquired', { journalId, userId: user.id });

    return ApiResponse.success({ locked: true, journalId });
  },
});

/**
 * PUT /api/rubric-score/lock/[journalId]
 * Refresh lock TTL (heartbeat). Must be current lock holder.
 */
export const PUT = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    const { journalId } = validateParams(params, paramsSchema);

    log.debug('Rubric lock heartbeat', { journalId, userId: user.id });

    const refreshed = await heartbeat(journalId, user.id);

    if (!refreshed) {
      throw BadRequestError('Lock not held by this user or lock expired');
    }

    return ApiResponse.success({ refreshed: true, journalId });
  },
});

/**
 * DELETE /api/rubric-score/lock/[journalId]
 * Release lock. Only the current holder can release.
 */
export const DELETE = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    const { journalId } = validateParams(params, paramsSchema);

    log.info('Releasing rubric lock', { journalId, userId: user.id });

    const released = await releaseLock(journalId, user.id);

    if (!released) {
      throw BadRequestError('Lock not held by this user');
    }

    log.info('Rubric lock released', { journalId, userId: user.id });

    return ApiResponse.success({ released: true, journalId });
  },
});

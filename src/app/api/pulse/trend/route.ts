/**
 * src/app/api/pulse/trend/route.ts
 * NAWASENA M04 — Pulse trend data endpoint.
 *
 * GET /api/pulse/trend?days=7 — Get own pulse trend for chart.
 * Supports days=7, 14, 30.
 */

import { createApiHandler, ApiResponse, validateQuery, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { getOwnTrend } from '@/lib/pulse/service';

const trendQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

/**
 * GET /api/pulse/trend
 * Returns pulse records over the last N days for charting.
 */
export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const { days } = validateQuery(req, trendQuerySchema);

    log.info('Fetching pulse trend', { userId: user.id, days });

    const pulses = await getOwnTrend(user.id, days ?? 7);

    log.info('Pulse trend fetched', { userId: user.id, count: pulses.length });

    return ApiResponse.success({ days, pulses });
  },
});

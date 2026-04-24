/**
 * src/app/api/cron/qr-session-expire/route.ts
 * NAWASENA M08 — Cron: Expire stale QR sessions
 *
 * Schedule (UTC): every 15 minutes ("* /15 * * * *" without space)
 * Marks ACTIVE KegiatanQRSession records as EXPIRED if past expiresAt.
 *
 * Vercel Cron sets Authorization: Bearer ${CRON_SECRET} automatically.
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { expireStaleQRSessions } from '@/lib/event-execution/services/qr.service';

export const GET = createApiHandler({
  auth: false,
  handler: async (req, { log }) => {
    verifyCronAuth(req);

    log.info('Cron: qr-session-expire started');

    const expiredCount = await expireStaleQRSessions();

    log.info('Cron: qr-session-expire complete', { expiredCount });

    return ApiResponse.success({ expiredCount });
  },
});

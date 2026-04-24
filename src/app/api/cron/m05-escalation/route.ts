/**
 * src/app/api/cron/m05-escalation/route.ts
 * NAWASENA M05 — POST: Nightly escalation cron (called by Vercel Cron).
 *
 * Schedule: "0 20 * * *" (03:00 WIB = 20:00 UTC)
 * Auth: verifyCronAuth (CRON_SECRET bearer token)
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { runEscalationCron } from '@/lib/passport/escalation.service';

export const POST = createApiHandler({
  handler: async (req, { log }) => {
    verifyCronAuth(req);

    log.info('M05 escalation cron triggered');

    const result = await runEscalationCron();

    log.info('M05 escalation cron complete', result as unknown as Record<string, unknown>);
    return ApiResponse.success(result);
  },
});

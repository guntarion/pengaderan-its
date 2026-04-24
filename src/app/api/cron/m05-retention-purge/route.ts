/**
 * src/app/api/cron/m05-retention-purge/route.ts
 * NAWASENA M05 — POST: Monthly retention purge (stub — Phase H deferred).
 *
 * Schedule: "0 20 1 * *" (monthly, 03:00 WIB)
 * Auth: verifyCronAuth
 *
 * NOTE: Actual retention logic is deferred to Phase H (M05 E2E + retention).
 * This stub returns 200 with { deferred: true } for now.
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron:m05-retention-purge');

export const POST = createApiHandler({
  handler: async (req) => {
    verifyCronAuth(req);

    log.info('M05 retention purge cron triggered (stub - Phase H deferred)');

    // Phase H: Implement actual S3 + DB purge for cohorts > 1 year old
    return ApiResponse.success({ deferred: true, message: 'Retention purge deferred to Phase H' });
  },
});

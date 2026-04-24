/**
 * src/app/api/cron/m09-cascade-processor/route.ts
 * NAWASENA M09 — Cron: process M09→M10 cascade job queue.
 *
 * Dequeues jobs from Redis m09:cascade-queue and calls M10 incident API.
 * Only runs when M09_M10_CASCADE_ENABLED=true.
 *
 * Schedule: (no fixed schedule — triggered by daily flag checks or manual)
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { isCascadeEnabled } from '@/lib/m09-cascade/flags';
import { dequeueCascadeJobs } from '@/lib/m09-cascade/job-queue';
import { processCascadeJob } from '@/lib/m09-cascade/m10-cascade';

export const GET = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (_req, ctx) => {
    if (!isCascadeEnabled()) {
      ctx.log.info('M09→M10 cascade is disabled via feature flag, skipping');
      return ApiResponse.success({ skipped: true, reason: 'FEATURE_FLAG_DISABLED' });
    }

    ctx.log.info('Processing M09 cascade queue');

    const jobs = await dequeueCascadeJobs(20);

    if (jobs.length === 0) {
      ctx.log.info('No cascade jobs in queue');
      return ApiResponse.success({ processed: 0 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const job of jobs) {
      try {
        await processCascadeJob(job);
        successCount++;
      } catch (err) {
        ctx.log.error('Cascade job failed', { job, err });
        failCount++;
      }
    }

    ctx.log.info('M09 cascade batch processed', {
      total: jobs.length,
      successCount,
      failCount,
    });

    return ApiResponse.success({ processed: jobs.length, successCount, failCount });
  },
});

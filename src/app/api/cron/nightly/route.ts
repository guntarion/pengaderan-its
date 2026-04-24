/**
 * src/app/api/cron/nightly/route.ts
 * Vercel Cron endpoint for nightly KPI aggregation.
 * Schedule: 0 19 * * * (02:00 WIB = 19:00 UTC)
 *
 * Auth: Bearer CRON_SECRET header check.
 * Do NOT use createApiHandler — cron routes verify Bearer directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { runNightlyAggregation } from '@/lib/dashboard/aggregation/cron-nightly';

const log = createLogger('m13/cron-nightly-route');

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.warn('CRON_SECRET not configured — rejecting request');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    log.warn('Unauthorized cron request', {
      hasAuth: !!authHeader,
      ip: request.headers.get('x-forwarded-for'),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestId = `cron-nightly-${Date.now()}`;
  log.info('Nightly cron triggered', { requestId });

  try {
    const result = await runNightlyAggregation();

    log.info('Nightly cron completed', {
      requestId,
      ...result,
    });

    return NextResponse.json({
      success: true,
      data: {
        runId: result.runId,
        cohortsProcessed: result.cohortsProcessed,
        cohortsFailed: result.cohortsFailed,
        totalKPIsComputed: result.totalKPIsComputed,
        totalKPIsSkipped: result.totalKPIsSkipped,
        durationMs: result.durationMs,
        errors: result.errors,
      },
    });
  } catch (err) {
    log.error('Nightly cron failed', { requestId, error: err });
    return NextResponse.json(
      {
        success: false,
        error: { code: 'CRON_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      },
      { status: 500 },
    );
  }
}

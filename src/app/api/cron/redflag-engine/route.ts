/**
 * src/app/api/cron/redflag-engine/route.ts
 * Vercel Cron endpoint for red flag rules engine.
 * Schedule: every 30 minutes — cron expression: star-slash-30 star star star star
 *
 * Auth: Bearer CRON_SECRET header check.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { runEngineForAllCohorts } from '@/lib/redflag-rules/engine';

const log = createLogger('m13/cron-redflag-route');

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.warn('CRON_SECRET not configured — rejecting request');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    log.warn('Unauthorized red flag cron request', {
      hasAuth: !!authHeader,
      ip: request.headers.get('x-forwarded-for'),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestId = `cron-redflag-${Date.now()}`;
  log.info('Red flag engine cron triggered', { requestId });

  try {
    const result = await runEngineForAllCohorts();

    log.info('Red flag engine cron completed', { requestId, ...result });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    log.error('Red flag engine cron failed', { requestId, error: err });
    return NextResponse.json(
      {
        success: false,
        error: { code: 'ENGINE_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      },
      { status: 500 },
    );
  }
}

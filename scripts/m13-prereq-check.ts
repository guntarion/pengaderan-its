/**
 * scripts/m13-prereq-check.ts
 * M13 prerequisite check script.
 *
 * Verifies that M01–M12 tables exist, KPIDef seeded, Redis up.
 *
 * Usage:
 *   npx tsx scripts/m13-prereq-check.ts
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../src/lib/logger';

const log = createLogger('m13-prereq-check');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkTableCounts() {
  const checks: Array<{ name: string; count: number; warn?: boolean }> = [];

  // M01 tables
  checks.push({ name: 'Organization', count: await prisma.organization.count() });
  checks.push({ name: 'Cohort', count: await prisma.cohort.count() });
  checks.push({ name: 'User', count: await prisma.user.count() });

  // M02 tables
  const kpiDefCount = await prisma.kPIDef.count();
  checks.push({
    name: 'KPIDef',
    count: kpiDefCount,
    warn: kpiDefCount < 80,
  });

  // M03 tables
  checks.push({ name: 'KPGroup', count: await prisma.kPGroup.count() });
  checks.push({ name: 'KasuhPair', count: await prisma.kasuhPair.count() });

  // M04 tables
  checks.push({ name: 'PulseCheck', count: await prisma.pulseCheck.count(), warn: false });
  checks.push({ name: 'Journal', count: await prisma.journal.count(), warn: false });
  checks.push({ name: 'RubrikScore', count: await prisma.rubrikScore.count(), warn: false });

  // M05 tables
  checks.push({ name: 'PassportEntry', count: await prisma.passportEntry.count(), warn: false });

  // M06 tables
  checks.push({ name: 'KegiatanInstance', count: await prisma.kegiatanInstance.count(), warn: false });
  checks.push({ name: 'EventNPS', count: await prisma.eventNPS.count(), warn: false });
  checks.push({ name: 'Attendance', count: await prisma.attendance.count(), warn: false });

  // M09 tables
  checks.push({ name: 'KasuhLog', count: await prisma.kasuhLog.count(), warn: false });

  // M10 tables
  checks.push({ name: 'SafeguardIncident', count: await prisma.safeguardIncident.count(), warn: false });

  // M11 tables
  checks.push({ name: 'MHScreening', count: await prisma.mHScreening.count(), warn: false });

  // M12 tables
  checks.push({ name: 'AnonReport', count: await prisma.anonReport.count(), warn: false });

  return checks;
}

async function checkRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    log.warn('Redis not configured (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing)');
    return { ok: false, latencyMs: null };
  }

  const start = Date.now();
  try {
    const resp = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      },
      signal: AbortSignal.timeout(2000),
    });
    const latencyMs = Date.now() - start;
    if (!resp.ok) {
      return { ok: false, latencyMs };
    }
    return { ok: true, latencyMs };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err };
  }
}

async function checkCronEnv() {
  return {
    hasCronSecret: !!process.env.CRON_SECRET,
    hasVercelEnv: !!process.env.VERCEL,
  };
}

async function main() {
  log.info('M13 prerequisite check starting...');
  let hasBlocker = false;

  // 1. Database table checks
  log.info('Checking database tables...');
  try {
    const tableCounts = await checkTableCounts();
    for (const check of tableCounts) {
      if (check.count === 0 && check.warn !== false) {
        log.warn(`Table ${check.name} is empty — data source may be missing`, { count: check.count });
      } else if (check.warn) {
        log.error(`BLOCKER: ${check.name} count (${check.count}) is below required minimum`, { count: check.count });
        hasBlocker = true;
      } else {
        log.info(`Table ${check.name}`, { count: check.count });
      }
    }
  } catch (err) {
    log.error('Database check failed', { error: err });
    hasBlocker = true;
  }

  // 2. KPIDef count check
  const kpiCount = await prisma.kPIDef.count();
  if (kpiCount < 80) {
    log.error(`BLOCKER: KPIDef count (${kpiCount}) < 80 — run M02 seed first`, { count: kpiCount });
    log.error('Action: cd docs/modul/02-master-data-taksonomi/ && re-run seed script');
    hasBlocker = true;
  } else {
    log.info(`KPIDef count OK: ${kpiCount} >= 80`);
  }

  // 3. Redis check
  log.info('Checking Redis connectivity...');
  const redis = await checkRedis();
  if (!redis.ok) {
    log.warn('Redis not available — dashboard caching will degrade gracefully', {
      latencyMs: redis.latencyMs,
    });
    // Not a hard blocker — withCache degrades
  } else if (redis.latencyMs && redis.latencyMs > 500) {
    log.warn('Redis latency high', { latencyMs: redis.latencyMs });
  } else {
    log.info('Redis ping OK', { latencyMs: redis.latencyMs });
  }

  // 4. Cron env check
  log.info('Checking cron environment...');
  const cronEnv = await checkCronEnv();
  if (!cronEnv.hasCronSecret) {
    log.warn('CRON_SECRET not set — cron endpoints will be unprotected until configured');
  } else {
    log.info('CRON_SECRET configured OK');
  }

  // Done
  if (hasBlocker) {
    log.error('M13 prerequisite check FAILED — blockers found above');
    process.exit(1);
  } else {
    log.info('M13 prerequisite check PASSED — all blockers resolved');
    process.exit(0);
  }
}

main()
  .catch((err) => {
    log.error('Prereq check crashed', { error: err });
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * src/lib/dashboard/aggregation/cron-nightly.ts
 * Nightly cron orchestrator for M13 Dashboard KPI aggregation.
 *
 * Run: every night at 02:00 WIB (19:00 UTC) via Vercel Cron.
 * Iterates all active cohorts, computes KPIs, writes KPISignal records.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { computeAllKPIsForCohort, KPIComputeSummary } from './kpi-compute';
import { computeKirkpatrickSnapshot } from './kirkpatrick';

const log = createLogger('m13/cron-nightly');

export interface NightlyRunResult {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  cohortsProcessed: number;
  cohortsFailed: number;
  totalKPIsComputed: number;
  totalKPIsSkipped: number;
  errors: string[];
}

/**
 * Main nightly aggregation orchestrator.
 * Fetches all active cohorts, computes KPIs + Kirkpatrick for each.
 */
export async function runNightlyAggregation(): Promise<NightlyRunResult> {
  const runId = `nightly-${Date.now()}`;
  const startedAt = new Date();

  log.info('Nightly aggregation starting', { runId });

  let cohortsProcessed = 0;
  let cohortsFailed = 0;
  let totalKPIsComputed = 0;
  let totalKPIsSkipped = 0;
  const errors: string[] = [];

  // Fetch all active cohorts
  const activeCohorts = await prisma.cohort.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, organizationId: true, code: true, name: true },
  });

  log.info('Active cohorts found', { count: activeCohorts.length, runId });

  for (const cohort of activeCohorts) {
    const cohortStart = Date.now();
    log.info('Processing cohort', { cohortId: cohort.id, code: cohort.code, runId });

    try {
      // Run KPI compute
      const kpiSummary: KPIComputeSummary = await computeAllKPIsForCohort(
        cohort.id,
        cohort.organizationId,
      );

      // Run Kirkpatrick snapshot + write to KPISignal
      const kirkSnapshot = await computeKirkpatrickSnapshot(cohort.id, cohort.organizationId);

      // Only write Kirkpatrick signals for real KPIDefs — skip synthetic ones
      // (Kirkpatrick is stored in the KPI signal table via its own aggregation pathway)
      log.debug('Kirkpatrick snapshot computed', {
        cohortId: cohort.id,
        levels: kirkSnapshot.levels.map((l) => ({
          level: l.level,
          value: l.value,
          partial: l.partial,
        })),
      });

      totalKPIsComputed += kpiSummary.computed;
      totalKPIsSkipped += kpiSummary.skipped;
      cohortsProcessed++;

      log.info('Cohort processed successfully', {
        cohortId: cohort.id,
        kpisComputed: kpiSummary.computed,
        kpisSkipped: kpiSummary.skipped,
        durationMs: Date.now() - cohortStart,
        runId,
      });
    } catch (err) {
      cohortsFailed++;
      const msg = `Cohort ${cohort.id}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      log.error('Cohort processing failed', { cohortId: cohort.id, error: err, runId });
    }
  }

  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  const result: NightlyRunResult = {
    runId,
    startedAt,
    completedAt,
    durationMs,
    cohortsProcessed,
    cohortsFailed,
    totalKPIsComputed,
    totalKPIsSkipped,
    errors,
  };

  log.info('Nightly aggregation completed', result as unknown as Record<string, unknown>);

  return result;
}

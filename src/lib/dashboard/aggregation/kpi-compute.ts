/**
 * src/lib/dashboard/aggregation/kpi-compute.ts
 * KPI compute iterator for M13 Dashboard.
 *
 * Iterates over KPIDef entries with measureMethod, maps to compute functions,
 * and writes KPISignal records.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { KPIPeriod, KPISignalSource } from '@prisma/client';
import { daysAgo, round2 } from './aggregation-helpers';

const log = createLogger('m13/kpi-compute');

export interface ComputeResult {
  kpiDefId: string;
  value: number;
  valueText?: string;
  period: KPIPeriod;
  metadata?: Record<string, unknown>;
}

export interface KPIComputeSummary {
  cohortId: string;
  computed: number;
  skipped: number;
  errors: string[];
  durationMs: number;
}

// Registry: maps measureMethod string to compute function
// Each function receives cohortId and returns a ComputeResult or null (skip)
type ComputeFn = (cohortId: string) => Promise<ComputeResult | null>;

/**
 * MEASURE_METHOD_REGISTRY
 * Maps measureMethod strings (from KPIDef) to compute functions.
 * Add new handlers as new KPIs are added.
 */
export const MEASURE_METHOD_REGISTRY: Record<string, ComputeFn> = {
  PULSE_AVG_7D: async (cohortId) => {
    const since = daysAgo(7);
    const result = await prisma.pulseCheck.aggregate({
      _avg: { mood: true },
      _count: { mood: true },
      where: { cohortId, recordedAt: { gte: since } },
    });
    if (!result._avg.mood) return null;
    return {
      kpiDefId: '', // set by caller
      value: round2(result._avg.mood) ?? 0,
      period: KPIPeriod.WEEKLY,
      metadata: { count: (result._count as { mood?: number }).mood ?? 0 },
    };
  },

  PULSE_AVG_30D: async (cohortId) => {
    const since = daysAgo(30);
    const result = await prisma.pulseCheck.aggregate({
      _avg: { mood: true },
      _count: { mood: true },
      where: { cohortId, recordedAt: { gte: since } },
    });
    if (!result._avg.mood) return null;
    return {
      kpiDefId: '',
      value: round2(result._avg.mood) ?? 0,
      period: KPIPeriod.MONTHLY,
      metadata: { count: (result._count as { mood?: number }).mood ?? 0 },
    };
  },

  NPS_AVG_30D: async (cohortId) => {
    const since = daysAgo(30);
    const result = await prisma.eventNPS.aggregate({
      _avg: { npsScore: true },
      _count: { npsScore: true },
      where: { instance: { cohortId }, recordedAt: { gte: since } },
    });
    if (!result._avg.npsScore) return null;
    return {
      kpiDefId: '',
      value: round2(result._avg.npsScore) ?? 0,
      period: KPIPeriod.MONTHLY,
      metadata: { count: (result._count as { npsScore?: number }).npsScore ?? 0 },
    };
  },

  ATTENDANCE_RATE_30D: async (cohortId) => {
    const since = daysAgo(30);
    const [present, total] = await Promise.all([
      prisma.attendance.count({ where: { instance: { cohortId }, status: 'HADIR', notedAt: { gte: since } } }),
      prisma.attendance.count({ where: { instance: { cohortId }, notedAt: { gte: since } } }),
    ]);
    if (total === 0) return null;
    return {
      kpiDefId: '',
      value: round2((present / total) * 100) ?? 0,
      period: KPIPeriod.MONTHLY,
      metadata: { present, total },
    };
  },

  RUBRIK_AVG_MONTHLY: async (cohortId) => {
    const since = daysAgo(30);
    const result = await prisma.rubrikScore.aggregate({
      _avg: { level: true },
      _count: { level: true },
      where: { cohortId, scoredAt: { gte: since } },
    });
    if (!result._avg.level) return null;
    return {
      kpiDefId: '',
      value: round2(result._avg.level) ?? 0,
      period: KPIPeriod.MONTHLY,
      metadata: { count: (result._count as { level?: number }).level ?? 0 },
    };
  },

  JOURNAL_SUBMISSION_RATE_7D: async (cohortId) => {
    // Count users with at least 1 journal vs total maba in cohort
    const since = daysAgo(7);
    const [submitters, totalMaba] = await Promise.all([
      prisma.journal.groupBy({
        by: ['userId'],
        where: { cohortId, createdAt: { gte: since } },
      }).then((g) => g.length),
      prisma.user.count({ where: { currentCohortId: cohortId, role: 'MABA' } }),
    ]);
    if (totalMaba === 0) return null;
    return {
      kpiDefId: '',
      value: round2((submitters / totalMaba) * 100) ?? 0,
      period: KPIPeriod.WEEKLY,
      metadata: { submitters, totalMaba },
    };
  },

  PASSPORT_COMPLETION_RATE: async (cohortId) => {
    const [completed, total] = await Promise.all([
      prisma.passportEntry.count({ where: { cohortId, status: 'VERIFIED' } }),
      prisma.passportEntry.count({ where: { cohortId } }),
    ]);
    if (total === 0) return null;
    return {
      kpiDefId: '',
      value: round2((completed / total) * 100) ?? 0,
      period: KPIPeriod.MONTHLY,
      metadata: { completed, total },
    };
  },

  INCIDENT_RESOLUTION_RATE: async (cohortId) => {
    const [resolved, total] = await Promise.all([
      prisma.safeguardIncident.count({ where: { cohortId, status: 'RESOLVED' } }),
      prisma.safeguardIncident.count({ where: { cohortId } }),
    ]);
    if (total === 0) return null;
    return {
      kpiDefId: '',
      value: round2((resolved / total) * 100) ?? 0,
      period: KPIPeriod.MONTHLY,
      metadata: { resolved, total },
    };
  },

  KASUH_LOG_COMPLETION_RATE: async (cohortId) => {
    const since = daysAgo(30);
    const [completed, total] = await Promise.all([
      prisma.kasuhLog.count({ where: { cohortId, attendance: 'MET', submittedAt: { gte: since } } }),
      prisma.kasuhLog.count({ where: { cohortId, submittedAt: { gte: since } } }),
    ]);
    if (total === 0) return null;
    return {
      kpiDefId: '',
      value: round2((completed / total) * 100) ?? 0,
      period: KPIPeriod.MONTHLY,
      metadata: { completed, total },
    };
  },

  PAKTA_SIGNED_RATE: async (cohortId) => {
    // Cohort-level: % of users who have signed their pakta
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { organizationId: true },
    });
    if (!cohort) return null;
    const [signed, total] = await Promise.all([
      prisma.user.count({
        where: {
          currentCohortId: cohortId,
          paktaPanitiaStatus: 'SIGNED',
          role: { in: ['KP', 'KASUH', 'OC', 'SC', 'BLM', 'SATGAS'] },
        },
      }),
      prisma.user.count({
        where: {
          currentCohortId: cohortId,
          role: { in: ['KP', 'KASUH', 'OC', 'SC', 'BLM', 'SATGAS'] },
        },
      }),
    ]);
    if (total === 0) return null;
    return {
      kpiDefId: '',
      value: round2((signed / total) * 100) ?? 0,
      period: KPIPeriod.MONTHLY,
      metadata: { signed, total },
    };
  },
};

/**
 * Compute all auto-computable KPIs for a cohort and write KPISignal records.
 */
export async function computeAllKPIsForCohort(
  cohortId: string,
  organizationId: string,
): Promise<KPIComputeSummary> {
  const startTime = Date.now();
  let computed = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Fetch all KPIDefs with a measureMethod
  const kpiDefs = await prisma.kPIDef.findMany({
    where: { measureMethod: { not: null } },
  });

  log.info('Starting KPI compute for cohort', {
    cohortId,
    organizationId,
    kpiDefCount: kpiDefs.length,
  });

  for (const kpiDef of kpiDefs) {
    if (!kpiDef.measureMethod) {
      skipped++;
      continue;
    }

    const computeFn = MEASURE_METHOD_REGISTRY[kpiDef.measureMethod];
    if (!computeFn) {
      log.debug('No compute handler for measureMethod — skipping', {
        kpiDefId: kpiDef.id,
        measureMethod: kpiDef.measureMethod,
      });
      skipped++;
      continue;
    }

    try {
      const result = await computeFn(cohortId);
      if (!result) {
        skipped++;
        continue;
      }

      // Upsert the KPISignal (create new — append-mostly pattern)
      await prisma.kPISignal.create({
        data: {
          organizationId,
          cohortId,
          kpiDefId: kpiDef.id,
          value: result.value,
          valueText: result.valueText,
          period: result.period,
          source: KPISignalSource.AUTO,
          metadata: result.metadata ? JSON.parse(JSON.stringify(result.metadata)) : undefined,
        },
      });

      computed++;
    } catch (err) {
      const msg = `KPIDef ${kpiDef.id}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      log.error('KPI compute failed', { kpiDefId: kpiDef.id, error: err });
    }
  }

  const durationMs = Date.now() - startTime;
  log.info('KPI compute completed for cohort', {
    cohortId,
    computed,
    skipped,
    errors: errors.length,
    durationMs,
  });

  return { cohortId, computed, skipped, errors, durationMs };
}

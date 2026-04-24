/**
 * src/lib/triwulan/generator/cohort-comparison.ts
 * NAWASENA M14 — Cohort Comparison sub-generator.
 *
 * Queries the previous cohort's FINALIZED review with the same quarterNumber,
 * extracts comparison metrics.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { ReviewStatus } from '@prisma/client';

const log = createLogger('m14/generator/cohort-comparison');

export interface MetricComparison {
  current: number | null;
  previous: number | null;
}

export interface CohortComparisonData {
  previousCohortId: string;
  previousCohortCode: string;
  previousQuarter: number;
  metrics: {
    retention: MetricComparison;
    npsAvg: MetricComparison;
    pulseAvg: MetricComparison;
  };
}

export interface CohortComparisonResult {
  data: CohortComparisonData | null;
  missing?: string[];
}

export async function generateCohortComparison(
  cohortId: string,
  organizationId: string,
  quarterNumber: number,
  currentSnapshot: Record<string, unknown>
): Promise<CohortComparisonResult> {
  try {
    log.info('Generating cohort comparison', { cohortId, organizationId, quarterNumber });

    // Find the current cohort to get ordering
    const currentCohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { startDate: true },
    });

    if (!currentCohort) {
      return { data: null, missing: ['cohortComparison'] };
    }

    // Find previous cohort by startDate (the one before current)
    const previousCohort = await prisma.cohort.findFirst({
      where: {
        organizationId,
        id: { not: cohortId },
        startDate: { lt: currentCohort.startDate },
      },
      orderBy: { startDate: 'desc' },
      select: { id: true, code: true },
    });

    if (!previousCohort) {
      log.info('No previous cohort found', { cohortId, organizationId });
      return { data: null, missing: undefined };
    }

    // Find FINALIZED review for previous cohort with same quarter
    const previousReview = await prisma.triwulanReview.findFirst({
      where: {
        cohortId: previousCohort.id,
        quarterNumber,
        status: ReviewStatus.FINALIZED,
        supersededByReviewId: null,
      },
      orderBy: { finalizedAt: 'desc' },
      select: {
        id: true,
        dataSnapshotJsonb: true,
      },
    });

    if (!previousReview) {
      log.info('No previous FINALIZED review found', {
        previousCohortId: previousCohort.id,
        quarterNumber,
      });
      return { data: null, missing: undefined };
    }

    const prevSnapshot = previousReview.dataSnapshotJsonb as Record<string, unknown>;
    const prevKpi = prevSnapshot.kpi as Record<string, { value: number } | null> | null;
    const currKpi = currentSnapshot.kpi as Record<string, { value: number } | null> | null;

    const data: CohortComparisonData = {
      previousCohortId: previousCohort.id,
      previousCohortCode: previousCohort.code,
      previousQuarter: quarterNumber,
      metrics: {
        retention: {
          current: currKpi?.retention?.value ?? null,
          previous: prevKpi?.retention?.value ?? null,
        },
        npsAvg: {
          current: currKpi?.npsAvg?.value ?? null,
          previous: prevKpi?.npsAvg?.value ?? null,
        },
        pulseAvg: {
          current: currKpi?.pulseAvg?.value ?? null,
          previous: prevKpi?.pulseAvg?.value ?? null,
        },
      },
    };

    log.info('Cohort comparison generated', {
      cohortId,
      previousCohortId: previousCohort.id,
      previousCohortCode: previousCohort.code,
    });
    return { data };
  } catch (err) {
    log.error('Cohort comparison failed', { error: err, cohortId });
    return { data: null, missing: ['cohortComparison'] };
  }
}

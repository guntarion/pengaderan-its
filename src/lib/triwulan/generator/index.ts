/**
 * src/lib/triwulan/generator/index.ts
 * NAWASENA M14 — Review Generator Orchestrator.
 *
 * Coordinates all sub-generators, assembles dataSnapshotJsonb,
 * detects escalations, and creates the TriwulanReview + initial GENERATE event.
 *
 * Idempotent: if a non-superseded review already exists for the same
 * cohortId + quarterNumber, returns the existing review.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { ReviewStatus, TriwulanEscalationLevel, Prisma } from '@prisma/client';

import { generateKpiSnapshot } from './kpi-snapshot';
import { generateKirkpatrickSnapshot } from './kirkpatrick-snapshot';
import { generateRedflagSnapshot } from './redflag-snapshot';
import { generateIncidentSnapshot } from './incident-snapshot';
import { generateAnonSnapshot } from './anon-snapshot';
import { generatePaktaSnapshot } from './pakta-snapshot';
import { generateComplianceSnapshot } from './compliance-snapshot';
import { generateCohortHealthSnapshot } from './cohort-health-snapshot';
import { generateForbiddenActsSnapshot } from './forbidden-acts-snapshot';
import { generateCohortComparison } from './cohort-comparison';
import { detectEscalations } from '../escalation/detector';
import { notifyEscalation } from '../escalation/notifier';
import { hashIP } from '../signature/ip-hasher';

const log = createLogger('m14/generator/orchestrator');

export interface GenerateTriwulanReviewInput {
  cohortId: string;
  quarterNumber: 1 | 2 | 3 | 4;
  generatedById: string;
  ipHash?: string; // pre-hashed from request; defaults to unknown
}

export interface GenerateTriwulanReviewResult {
  reviewId: string;
  status: ReviewStatus;
  escalationLevel: TriwulanEscalationLevel;
  dataPartial: boolean;
  isExisting: boolean;
}

/** Compute quarter start/end dates given year + quarter number */
function getQuarterDates(year: number, quarter: 1 | 2 | 3 | 4): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999)); // last day of quarter
  return { start, end };
}

/** Wrap a promise with a 5-second timeout. Returns null on timeout/error. */
async function withTimeout<T>(
  promise: Promise<{ data: T | null; missing?: string[] }>,
  sourceName: string
): Promise<{ data: T | null; missing: string[] }> {
  const timeoutPromise = new Promise<{ data: null; missing: string[] }>((resolve) =>
    setTimeout(() => {
      log.warn('Sub-generator timeout', { source: sourceName });
      resolve({ data: null, missing: [sourceName] });
    }, 5000)
  );
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return { data: result.data, missing: result.missing ?? [] };
  } catch (err) {
    log.error('Sub-generator error', { error: err, source: sourceName });
    return { data: null, missing: [sourceName] };
  }
}

export async function generateTriwulanReview(
  input: GenerateTriwulanReviewInput
): Promise<GenerateTriwulanReviewResult> {
  const { cohortId, quarterNumber, generatedById, ipHash } = input;

  log.info('Starting review generation', { cohortId, quarterNumber, generatedById });

  // Validate cohort exists and get organizationId
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { id: true, organizationId: true, startDate: true },
  });

  if (!cohort) {
    throw new Error(`Cohort not found: ${cohortId}`);
  }

  // Idempotency check: return existing non-superseded review if it exists
  const existing = await prisma.triwulanReview.findFirst({
    where: {
      cohortId,
      quarterNumber,
      supersededByReviewId: null,
    },
    select: {
      id: true,
      status: true,
      escalationLevel: true,
      dataSnapshotJsonb: true,
    },
  });

  if (existing) {
    log.info('Returning existing review (idempotent)', {
      reviewId: existing.id,
      cohortId,
      quarterNumber,
    });
    const snap = existing.dataSnapshotJsonb as Record<string, unknown>;
    return {
      reviewId: existing.id,
      status: existing.status,
      escalationLevel: existing.escalationLevel,
      dataPartial: (snap.dataPartial as boolean) ?? false,
      isExisting: true,
    };
  }

  // Compute quarter dates from current year
  const now = new Date();
  const year = now.getFullYear();
  const { start: quarterStart, end: quarterEnd } = getQuarterDates(year, quarterNumber);
  const generatedMidQuarter = now < quarterEnd;

  // Insufficient data check: cohort started less than 1 month ago
  const cohortAgeMs = now.getTime() - cohort.startDate.getTime();
  const insufficientData = cohortAgeMs < 30 * 24 * 60 * 60 * 1000; // < 1 month

  log.info('Running sub-generators', {
    cohortId,
    quarterStart,
    quarterEnd,
    generatedMidQuarter,
  });

  // Run all sub-generators in parallel with 5s timeout each
  const [
    kpiResult,
    kirkpatrickResult,
    redflagResult,
    incidentResult,
    anonResult,
    paktaResult,
    complianceResult,
    cohortHealthResult,
    forbiddenActsResult,
  ] = await Promise.all([
    withTimeout(generateKpiSnapshot(cohortId, quarterStart, quarterEnd), 'kpi'),
    withTimeout(generateKirkpatrickSnapshot(cohortId, quarterStart, quarterEnd), 'kirkpatrick'),
    withTimeout(generateRedflagSnapshot(cohortId, quarterStart, quarterEnd), 'redFlags'),
    withTimeout(generateIncidentSnapshot(cohortId, quarterStart, quarterEnd), 'incidents'),
    withTimeout(generateAnonSnapshot(cohortId, quarterStart, quarterEnd), 'anonReports'),
    withTimeout(generatePaktaSnapshot(cohortId, quarterStart, quarterEnd), 'compliance.paktaSigningRate'),
    withTimeout(generateComplianceSnapshot(cohortId, quarterStart, quarterEnd), 'compliance'),
    withTimeout(generateCohortHealthSnapshot(cohortId, quarterStart, quarterEnd), 'cohortHealth'),
    withTimeout(generateForbiddenActsSnapshot(cohortId, quarterStart, quarterEnd), 'forbiddenActs'),
  ]);

  // Collect all missing sources
  const missingSources: string[] = [
    ...kpiResult.missing,
    ...kirkpatrickResult.missing,
    ...redflagResult.missing,
    ...incidentResult.missing,
    ...anonResult.missing,
    ...paktaResult.missing,
    ...complianceResult.missing,
    ...cohortHealthResult.missing,
    ...forbiddenActsResult.missing,
  ];

  const dataPartial = missingSources.length > 0;

  // Build compliance section (merge pakta + compliance)
  const complianceSection = {
    ...(complianceResult.data ?? {}),
    paktaSigningRate: paktaResult.data?.paktaSigningRate ?? null,
  };

  // Build snapshot (without cohortComparison first, for escalation detection)
  const partialSnapshot: Record<string, unknown> = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    generatedMidQuarter,
    dataPartial,
    missingSources,
    insufficientData,
    quarterStartDate: quarterStart.toISOString(),
    quarterEndDate: quarterEnd.toISOString(),
    kpi: kpiResult.data,
    kirkpatrick: kirkpatrickResult.data,
    redFlags: redflagResult.data,
    incidents: incidentResult.data,
    anonReports: anonResult.data,
    compliance: complianceSection,
    cohortHealth: cohortHealthResult.data,
    forbiddenActs: forbiddenActsResult.data,
  };

  // Detect escalations
  const org = await prisma.organization.findUnique({
    where: { id: cohort.organizationId },
    select: { settings: true },
  });
  const { flags, level: escalationLevel } = detectEscalations(
    partialSnapshot,
    org?.settings as Record<string, unknown> | null
  );

  // Cohort comparison (depends on existing data — run after snapshot is built)
  const comparisonResult = await withTimeout(
    generateCohortComparison(cohortId, cohort.organizationId, quarterNumber, partialSnapshot),
    'cohortComparison'
  );

  if (comparisonResult.missing.length > 0) {
    missingSources.push(...comparisonResult.missing);
  }

  // Final snapshot with all sections
  const dataSnapshotJsonb: Record<string, unknown> = {
    ...partialSnapshot,
    escalationFlags: flags,
    cohortComparison: comparisonResult.data,
  };

  const effectiveIpHash = ipHash ?? hashIP('unknown');

  // Create the review row and GENERATE signature event in a transaction
  const review = await prisma.$transaction(async (tx) => {
    const newReview = await tx.triwulanReview.create({
      data: {
        organizationId: cohort.organizationId,
        cohortId,
        quarterNumber,
        quarterStartDate: quarterStart,
        quarterEndDate: quarterEnd,
        dataSnapshotJsonb: dataSnapshotJsonb as Prisma.InputJsonValue,
        snapshotVersion: '1.0',
        generatedAt: new Date(),
        generatedById,
        status: ReviewStatus.DRAFT,
        escalationLevel,
      },
    });

    await tx.triwulanSignatureEvent.create({
      data: {
        organizationId: cohort.organizationId,
        reviewId: newReview.id,
        actorId: generatedById,
        action: 'GENERATE',
        ipHash: effectiveIpHash,
        metadata: {
          quarterNumber,
          escalationLevel,
          dataPartial,
          missingSources,
        },
      },
    });

    return newReview;
  });

  log.info('Review generated', {
    reviewId: review.id,
    cohortId,
    quarterNumber,
    escalationLevel,
    dataPartial,
    missingSourceCount: missingSources.length,
  });

  // Notify if escalation detected (non-blocking)
  if (escalationLevel !== TriwulanEscalationLevel.NONE) {
    notifyEscalation(review, flags).catch(() => {}); // fire-and-forget
  }

  return {
    reviewId: review.id,
    status: review.status,
    escalationLevel: review.escalationLevel,
    dataPartial,
    isExisting: false,
  };
}

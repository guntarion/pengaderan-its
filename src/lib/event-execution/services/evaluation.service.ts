/**
 * src/lib/event-execution/services/evaluation.service.ts
 * NAWASENA M08 — Post-event evaluation service.
 *
 * - getPrefillData: compute attendance%, NPS score, redFlagsCount (M10 fallback)
 * - submitEvaluation: validate + create/update evaluation
 * - deleteEvaluationBySC: SC force-delete + audit
 */

import { prisma } from '@/utils/prisma';
import { withCache, CACHE_TTL } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import { invalidateEvaluationCache } from '../cache/invalidate';
import type { SubmitEvaluationInput } from '../schemas';

const log = createLogger('event-execution:evaluation-service');

// ============================================================
// getPrefillData
// ============================================================

export interface EvaluationPrefill {
  instanceId: string;
  instanceStatus: string;
  scheduledAt: Date;
  executedAt: Date | null;
  kegiatanNama: string;
  // Prefill computed values
  attendancePct: number | null;
  attendancePctSource: 'computed' | null;
  confirmedCount: number;
  hadirCount: number;
  // NPS from M06 EventNPS
  npsScore: number | null;
  npsScoreSource: 'computed' | null;
  npsResponseCount: number;
  // M10 — not integrated yet
  redFlagsCount: number | null;
  redFlagsSource: 'M10' | 'unavailable';
  // Existing evaluation if any
  existingEvaluation: {
    id: string;
    attendancePct: number | null;
    attendancePctOverride: number | null;
    npsScore: number | null;
    npsScoreOverride: number | null;
    scoreL2agg: number | null;
    notes: string | null;
    filledAt: Date;
    submittedLate: boolean;
  } | null;
}

export async function getPrefillData(
  instanceId: string,
  organizationId: string,
): Promise<EvaluationPrefill> {
  const cacheKey = `event-execution:instance:${instanceId}:evaluation:prefill`;

  return withCache(cacheKey, CACHE_TTL.MEDIUM, async () => {
    log.debug('Computing evaluation prefill', { instanceId });

    const [instance, attendanceCounts, npsAgg, existingEval] = await Promise.all([
      prisma.kegiatanInstance.findFirst({
        where: { id: instanceId, organizationId },
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          executedAt: true,
          kegiatan: { select: { nama: true } },
        },
      }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: { instanceId, organizationId },
        _count: { id: true },
      }),
      prisma.eventNPS.aggregate({
        where: { instanceId, organizationId },
        _avg: { npsScore: true },
        _count: { id: true },
      }),
      prisma.kegiatanEvaluation.findFirst({
        where: { instanceId },
        select: {
          id: true,
          attendancePct: true,
          attendancePctOverride: true,
          npsScore: true,
          npsScoreOverride: true,
          scoreL2agg: true,
          notes: true,
          filledAt: true,
          submittedLate: true,
        },
      }),
    ]);

    if (!instance) {
      throw new Error('NOT_FOUND: Instance tidak ditemukan.');
    }

    const confirmedCount = await prisma.rSVP.count({
      where: { instanceId, organizationId, status: 'CONFIRMED' },
    });

    const hadirCount = attendanceCounts.find((r) => r.status === 'HADIR')?._count.id ?? 0;
    const attendancePct =
      confirmedCount > 0 ? Math.round((hadirCount / confirmedCount) * 100) / 100 : null;

    const npsResponseCount = npsAgg._count.id;
    const npsScore = npsResponseCount >= 5 ? (npsAgg._avg.npsScore ?? null) : null;

    return {
      instanceId,
      instanceStatus: instance.status,
      scheduledAt: instance.scheduledAt,
      executedAt: instance.executedAt,
      kegiatanNama: instance.kegiatan.nama,
      attendancePct,
      attendancePctSource: attendancePct !== null ? 'computed' : null,
      confirmedCount,
      hadirCount,
      npsScore,
      npsScoreSource: npsScore !== null ? 'computed' : null,
      npsResponseCount,
      // M10 not integrated — return null with disclaimer
      redFlagsCount: null,
      redFlagsSource: 'unavailable',
      existingEvaluation: existingEval ?? null,
    };
  });
}

// ============================================================
// submitEvaluation
// ============================================================

/**
 * Create or reject duplicate evaluation submission.
 * 409 if already submitted (SC can delete first via deleteEvaluationBySC).
 */
export async function submitEvaluation(
  instanceId: string,
  userId: string,
  organizationId: string,
  input: SubmitEvaluationInput,
): Promise<{ id: string; submittedLate: boolean }> {
  log.info('Submitting evaluation', { instanceId, userId });

  // Check for existing
  const existing = await prisma.kegiatanEvaluation.findFirst({
    where: { instanceId },
    select: { id: true },
  });
  if (existing) {
    throw new Error('CONFLICT: Evaluasi sudah pernah disubmit untuk instance ini. Hubungi SC untuk menghapusnya.');
  }

  // Verify instance is DONE
  const instance = await prisma.kegiatanInstance.findFirst({
    where: { id: instanceId, organizationId },
    select: { id: true, status: true, executedAt: true },
  });
  if (!instance) {
    throw new Error('NOT_FOUND: Instance tidak ditemukan.');
  }
  if (instance.status !== 'DONE') {
    throw new Error('INVALID_STATE: Evaluasi hanya bisa disubmit untuk kegiatan yang sudah DONE.');
  }

  // Detect late submission (> 14 days after DONE)
  const submittedLate =
    instance.executedAt
      ? new Date().getTime() - instance.executedAt.getTime() > 14 * 24 * 60 * 60 * 1000
      : false;

  // Compute prefill values for the final record
  const prefill = await getPrefillData(instanceId, organizationId);

  const evaluation = await prisma.kegiatanEvaluation.create({
    data: {
      instanceId,
      organizationId,
      filledById: userId,
      // Use override if provided, else computed
      attendancePct: input.attendancePctOverride ?? prefill.attendancePct,
      attendancePctOverride: input.attendancePctOverride ?? null,
      attendancePctOverrideReason: input.attendancePctOverrideReason ?? null,
      npsScore: input.npsScoreOverride ?? prefill.npsScore,
      npsScoreOverride: input.npsScoreOverride ?? null,
      npsScoreOverrideReason: input.npsScoreOverrideReason ?? null,
      npsResponseCount: prefill.npsResponseCount,
      redFlagsCount: null, // M10 not live
      scoreL2agg: input.scoreL2agg ?? null,
      notes: input.notes ?? null,
      submittedLate,
    },
    select: { id: true, submittedLate: true },
  });

  // Audit log
  await logAudit({
    action: AuditAction.KEGIATAN_EVALUATION_SUBMIT,
    organizationId,
    actorUserId: userId,
    entityType: 'KegiatanEvaluation',
    entityId: evaluation.id,
    afterValue: {
      attendancePct: evaluation.submittedLate,
      overrides: {
        attendance: !!input.attendancePctOverride,
        nps: !!input.npsScoreOverride,
      },
    },
    metadata: { submittedLate },
  });

  // Invalidate cache
  await invalidateEvaluationCache(instanceId);

  log.info('Evaluation submitted', { evaluationId: evaluation.id, submittedLate });

  return evaluation;
}

// ============================================================
// deleteEvaluationBySC
// ============================================================

export async function deleteEvaluationBySC(
  evaluationId: string,
  scUserId: string,
  organizationId: string,
  reason: string,
): Promise<void> {
  log.info('SC deleting evaluation', { evaluationId, scUserId });

  const evaluation = await prisma.kegiatanEvaluation.findFirst({
    where: { id: evaluationId, organizationId },
    select: { id: true, instanceId: true },
  });
  if (!evaluation) {
    throw new Error('NOT_FOUND: Evaluasi tidak ditemukan.');
  }

  await prisma.kegiatanEvaluation.delete({ where: { id: evaluationId } });

  await logAudit({
    action: AuditAction.KEGIATAN_EVALUATION_DELETE_BY_SC,
    organizationId,
    actorUserId: scUserId,
    entityType: 'KegiatanEvaluation',
    entityId: evaluationId,
    metadata: { reason, instanceId: evaluation.instanceId },
  });

  await invalidateEvaluationCache(evaluation.instanceId);

  log.info('Evaluation deleted by SC', { evaluationId });
}

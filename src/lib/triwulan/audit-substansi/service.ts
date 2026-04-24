/**
 * src/lib/triwulan/audit-substansi/service.ts
 * NAWASENA M14 — BLM Audit Substansi Service Layer.
 *
 * Functions for BLM: list items, upsert item, acknowledge, request revision.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import {
  MuatanWajibKey,
  MuatanCoverageStatus,
  ReviewStatus,
  Prisma,
} from '@prisma/client';
import { getAllItems } from './muatan-wajib';
import { canBLMAcknowledge, transition } from '../state-machine/transitions';
import { notifyRevisionRequested } from '../escalation/notifier';

const log = createLogger('m14/audit-substansi-service');

// Lazy import for PDF queue to avoid circular dep
let enqueuePDFRenderFn: ((reviewId: string) => void) | null = null;
export function setPDFQueueFunction(fn: (reviewId: string) => void): void {
  enqueuePDFRenderFn = fn;
}

export async function listAuditItems(reviewId: string) {
  const existingResults = await prisma.auditSubstansiResult.findMany({
    where: { reviewId },
    include: {
      assessedBy: { select: { id: true, displayName: true, fullName: true } },
    },
  });

  const resultMap = new Map(existingResults.map((r) => [r.itemKey, r]));
  const allItems = getAllItems();

  // Merge catalog with existing results (return all 10 items)
  return allItems.map((item) => ({
    ...item,
    result: resultMap.get(item.key) ?? {
      id: null,
      coverage: MuatanCoverageStatus.NOT_ASSESSED,
      evidenceRef: null,
      notes: null,
      assessedById: null,
      assessedAt: null,
      assessedBy: null,
    },
  }));
}

export async function upsertAuditItem(input: {
  reviewId: string;
  itemKey: MuatanWajibKey;
  coverage: MuatanCoverageStatus;
  evidenceRef?: string;
  notes?: string;
  userId: string;
  orgId: string;
  ipHash: string;
}): Promise<void> {
  const { reviewId, itemKey, coverage, evidenceRef, notes, userId, orgId, ipHash } = input;

  // Validate: NOT_COVERED or PARTIAL requires notes ≥ 50 chars
  if (
    (coverage === MuatanCoverageStatus.NOT_COVERED || coverage === MuatanCoverageStatus.PARTIAL) &&
    (!notes || notes.trim().length < 50)
  ) {
    throw Object.assign(
      new Error('Catatan harus diisi minimal 50 karakter untuk muatan yang tidak/sebagian tercakup'),
      { code: 'VALIDATION_ERROR' }
    );
  }

  await prisma.$transaction([
    prisma.auditSubstansiResult.upsert({
      where: { asr_review_item_unique: { reviewId, itemKey } },
      create: {
        organizationId: orgId,
        reviewId,
        itemKey,
        coverage,
        evidenceRef: evidenceRef ?? null,
        notes: notes ?? null,
        assessedById: userId,
        assessedAt: new Date(),
      },
      update: {
        coverage,
        evidenceRef: evidenceRef ?? null,
        notes: notes ?? null,
        assessedById: userId,
        assessedAt: new Date(),
      },
    }),
    prisma.triwulanSignatureEvent.create({
      data: {
        organizationId: orgId,
        reviewId,
        actorId: userId,
        action: 'BLM_AUDIT_ITEM_TICK',
        ipHash,
        metadata: { itemKey, coverage },
      },
    }),
  ]);

  log.info('Audit item upserted', { reviewId, itemKey, coverage, userId });
}

export async function acknowledgeByBLM(input: {
  reviewId: string;
  userId: string;
  notes: string;
  ipHash: string;
}): Promise<void> {
  const { reviewId, userId, notes, ipHash } = input;

  const review = await prisma.triwulanReview.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true, organizationId: true, cohortId: true, quarterNumber: true },
  });

  if (!review) {
    throw Object.assign(new Error('Review tidak ditemukan'), { code: 'NOT_FOUND' });
  }

  // Count assessed items (coverage != NOT_ASSESSED)
  const assessedCount = await prisma.auditSubstansiResult.count({
    where: {
      reviewId,
      coverage: { not: MuatanCoverageStatus.NOT_ASSESSED },
    },
  });

  const check = canBLMAcknowledge(review.status, assessedCount);
  if (!check.ok) {
    throw Object.assign(new Error(check.error!), { code: 'CHECKLIST_INCOMPLETE' });
  }

  const trans = transition(review.status, 'BLM_ACKNOWLEDGE');
  if (!trans.ok || !trans.newStatus) {
    throw Object.assign(new Error(trans.error ?? 'Transisi status gagal'), { code: 'INVALID_STATE' });
  }

  const now = new Date();

  const result = await prisma.triwulanReview.updateMany({
    where: { id: reviewId, status: ReviewStatus.PEMBINA_SIGNED },
    data: {
      status: trans.newStatus,
      blmAcknowledgedAt: now,
      blmAcknowledgedById: userId,
      blmNotes: notes,
      pdfStatus: 'PENDING',
    },
  });

  if (result.count === 0) {
    throw Object.assign(
      new Error('Review telah diproses (conflict)'),
      { code: 'CONFLICT' }
    );
  }

  await prisma.triwulanSignatureEvent.create({
    data: {
      organizationId: review.organizationId,
      reviewId,
      actorId: userId,
      action: 'BLM_ACKNOWLEDGE',
      ipHash,
      notes,
      metadata: { acknowledgedAt: now.toISOString(), assessedCount },
    },
  });

  log.info('BLM acknowledged review', { reviewId, userId, assessedCount });

  // Enqueue PDF render job (non-blocking, fire-and-forget)
  if (enqueuePDFRenderFn) {
    try {
      enqueuePDFRenderFn(reviewId);
    } catch (err) {
      log.error('Failed to enqueue PDF render job', { error: err, reviewId });
    }
  } else {
    log.warn('PDF render queue not configured — skipping PDF generation', { reviewId });
  }
}

export async function requestRevisionByBLM(input: {
  reviewId: string;
  userId: string;
  reason: string;
  ipHash: string;
  reviewerName: string;
}): Promise<{ newReviewId: string }> {
  const { reviewId, userId, reason, ipHash, reviewerName } = input;

  if (reason.length < 50) {
    throw Object.assign(
      new Error('Alasan revisi harus minimal 50 karakter'),
      { code: 'VALIDATION_ERROR' }
    );
  }

  const oldReview = await prisma.triwulanReview.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      cohortId: true,
      quarterNumber: true,
      quarterStartDate: true,
      quarterEndDate: true,
      dataSnapshotJsonb: true,
      generatedById: true,
    },
  });

  if (!oldReview) {
    throw Object.assign(new Error('Review tidak ditemukan'), { code: 'NOT_FOUND' });
  }

  if (oldReview.status !== ReviewStatus.PEMBINA_SIGNED) {
    throw Object.assign(
      new Error('Revisi BLM hanya dapat diminta saat review berstatus PEMBINA_SIGNED'),
      { code: 'INVALID_STATE' }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const newReview = await tx.triwulanReview.create({
      data: {
        organizationId: oldReview.organizationId,
        cohortId: oldReview.cohortId,
        quarterNumber: oldReview.quarterNumber,
        quarterStartDate: oldReview.quarterStartDate,
        quarterEndDate: oldReview.quarterEndDate,
        dataSnapshotJsonb: oldReview.dataSnapshotJsonb as Prisma.InputJsonValue,
        snapshotVersion: '1.0',
        generatedById: oldReview.generatedById,
        status: ReviewStatus.DRAFT,
        escalationLevel: 'NONE',
        previousReviewId: oldReview.id,
        revisionReason: reason,
      },
    });

    await tx.triwulanReview.update({
      where: { id: reviewId },
      data: { supersededByReviewId: newReview.id },
    });

    await tx.triwulanSignatureEvent.create({
      data: {
        organizationId: oldReview.organizationId,
        reviewId,
        actorId: userId,
        action: 'BLM_REQUEST_REVISION',
        ipHash,
        notes: reason,
        metadata: { newReviewId: newReview.id },
      },
    });

    return newReview;
  });

  log.info('Revision requested by BLM', {
    oldReviewId: reviewId,
    newReviewId: result.id,
    userId,
  });

  // Notify SC (non-blocking)
  notifyRevisionRequested(
    reviewId,
    result.id,
    oldReview.organizationId,
    oldReview.cohortId,
    oldReview.quarterNumber,
    reviewerName,
    'BLM',
    reason
  ).catch(() => {});

  return { newReviewId: result.id };
}

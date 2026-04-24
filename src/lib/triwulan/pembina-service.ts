/**
 * src/lib/triwulan/pembina-service.ts
 * NAWASENA M14 — Pembina Service Layer.
 *
 * Functions for Pembina: list, sign, request revision.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { ReviewStatus, Prisma } from '@prisma/client';
import { canPembinaSign, transition } from './state-machine/transitions';
import { notifyRevisionRequested } from './escalation/notifier';

const log = createLogger('m14/pembina-service');

export async function listAwaitingPembina(orgId: string) {
  return prisma.triwulanReview.findMany({
    where: {
      organizationId: orgId,
      status: ReviewStatus.SUBMITTED_FOR_PEMBINA,
      supersededByReviewId: null,
    },
    include: {
      generatedBy: { select: { id: true, displayName: true, fullName: true } },
      submittedBy: { select: { id: true, displayName: true, fullName: true } },
      cohort: { select: { code: true, name: true } },
    },
    orderBy: { submittedAt: 'asc' },
  });
}

export async function signByPembina(input: {
  reviewId: string;
  userId: string;
  notes: string;
  inPersonReviewed: boolean;
  ipHash: string;
}): Promise<void> {
  const { reviewId, userId, notes, inPersonReviewed, ipHash } = input;

  const review = await prisma.triwulanReview.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      escalationLevel: true,
    },
  });

  if (!review) {
    throw Object.assign(new Error('Review tidak ditemukan'), { code: 'NOT_FOUND' });
  }

  // Validate via guards
  const check = canPembinaSign(
    review.status,
    review.escalationLevel,
    notes,
    inPersonReviewed
  );
  if (!check.ok) {
    throw Object.assign(new Error(check.error!), { code: 'VALIDATION_ERROR' });
  }

  const trans = transition(review.status, 'PEMBINA_SIGN');
  if (!trans.ok || !trans.newStatus) {
    throw Object.assign(new Error(trans.error ?? 'Transisi status gagal'), { code: 'INVALID_STATE' });
  }

  const now = new Date();

  // Optimistic concurrency: UPDATE WHERE status=SUBMITTED_FOR_PEMBINA
  const result = await prisma.triwulanReview.updateMany({
    where: { id: reviewId, status: ReviewStatus.SUBMITTED_FOR_PEMBINA },
    data: {
      status: trans.newStatus,
      pembinaSignedAt: now,
      pembinaSignedById: userId,
      pembinaNotes: notes,
      pembinaInPersonReviewed: inPersonReviewed,
    },
  });

  if (result.count === 0) {
    throw Object.assign(
      new Error('Review telah diproses oleh Pembina lain (conflict)'),
      { code: 'CONFLICT' }
    );
  }

  // Emit signature event
  await prisma.triwulanSignatureEvent.create({
    data: {
      organizationId: review.organizationId,
      reviewId,
      actorId: userId,
      action: 'PEMBINA_SIGN',
      ipHash,
      notes,
      metadata: { inPersonReviewed, signedAt: now.toISOString() },
    },
  });

  log.info('Review signed by Pembina', { reviewId, userId, inPersonReviewed });
}

export async function requestRevisionByPembina(input: {
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

  if (oldReview.status !== ReviewStatus.SUBMITTED_FOR_PEMBINA) {
    throw Object.assign(
      new Error('Revisi hanya dapat diminta saat review berstatus SUBMITTED_FOR_PEMBINA'),
      { code: 'INVALID_STATE' }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create new review (draft) with copied snapshot
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

    // Supersede old review
    await tx.triwulanReview.update({
      where: { id: reviewId },
      data: { supersededByReviewId: newReview.id },
    });

    // Emit signature event on old review
    await tx.triwulanSignatureEvent.create({
      data: {
        organizationId: oldReview.organizationId,
        reviewId,
        actorId: userId,
        action: 'PEMBINA_REQUEST_REVISION',
        ipHash,
        notes: reason,
        metadata: { newReviewId: newReview.id },
      },
    });

    // Emit GENERATE event on new review
    await tx.triwulanSignatureEvent.create({
      data: {
        organizationId: oldReview.organizationId,
        reviewId: newReview.id,
        actorId: userId,
        action: 'GENERATE',
        ipHash,
        notes: `Revisi dari review ${reviewId}`,
        metadata: { previousReviewId: reviewId, reason },
      },
    });

    return newReview;
  });

  log.info('Revision requested by Pembina', {
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
    'PEMBINA',
    reason
  ).catch(() => {});

  return { newReviewId: result.id };
}

/**
 * src/lib/triwulan/sc-service.ts
 * NAWASENA M14 — SC Service Layer.
 *
 * Functions for SC operations: list, update draft narrative, submit to Pembina.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { ReviewStatus } from '@prisma/client';
import { canSubmit, transition } from './state-machine/transitions';
import { hashIP } from './signature/ip-hasher';
import { notifySubmittedWaitingPembina } from './escalation/notifier';

const log = createLogger('m14/sc-service');

export async function listForSC(cohortId: string, orgId: string) {
  return prisma.triwulanReview.findMany({
    where: {
      cohortId,
      organizationId: orgId,
    },
    include: {
      generatedBy: { select: { id: true, displayName: true, fullName: true } },
      submittedBy: { select: { id: true, displayName: true, fullName: true } },
      cohort: { select: { code: true, name: true } },
      _count: { select: { auditSubstansiResults: true, signatureEvents: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateDraftNarrative(
  reviewId: string,
  userId: string,
  narrative: string,
  ipHash: string
): Promise<void> {
  const review = await prisma.triwulanReview.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true, organizationId: true },
  });

  if (!review) {
    throw Object.assign(new Error('Review tidak ditemukan'), { code: 'NOT_FOUND' });
  }
  if (review.status !== ReviewStatus.DRAFT) {
    throw Object.assign(new Error('Narasi hanya dapat diubah saat status DRAFT'), {
      code: 'INVALID_STATE',
    });
  }
  if (!narrative || narrative.trim().length < 1) {
    throw Object.assign(new Error('Narasi tidak boleh kosong'), { code: 'VALIDATION_ERROR' });
  }

  await prisma.$transaction([
    prisma.triwulanReview.update({
      where: { id: reviewId },
      data: { executiveSummary: narrative },
    }),
    prisma.triwulanSignatureEvent.create({
      data: {
        organizationId: review.organizationId,
        reviewId,
        actorId: userId,
        action: 'SC_EDIT_DRAFT',
        ipHash,
        metadata: { narrativeLength: narrative.length },
      },
    }),
  ]);

  log.info('Draft narrative updated', { reviewId, userId, narrativeLength: narrative.length });
}

export async function submitToPembina(
  reviewId: string,
  userId: string,
  ipHash: string
): Promise<void> {
  const review = await prisma.triwulanReview.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      cohortId: true,
      quarterNumber: true,
      executiveSummary: true,
      generatedById: true,
    },
  });

  if (!review) {
    throw Object.assign(new Error('Review tidak ditemukan'), { code: 'NOT_FOUND' });
  }

  // Validate via state machine + guards
  const narrativeLength = review.executiveSummary?.length ?? 0;
  const check = canSubmit(review.status, narrativeLength);
  if (!check.ok) {
    throw Object.assign(new Error(check.error!), { code: 'INVALID_STATE' });
  }

  const trans = transition(review.status, 'SUBMIT_TO_PEMBINA');
  if (!trans.ok || !trans.newStatus) {
    throw Object.assign(new Error(trans.error ?? 'Transisi status gagal'), { code: 'INVALID_STATE' });
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.triwulanReview.update({
      where: { id: reviewId },
      data: {
        status: trans.newStatus,
        submittedAt: now,
        submittedById: userId,
      },
    }),
    prisma.triwulanSignatureEvent.create({
      data: {
        organizationId: review.organizationId,
        reviewId,
        actorId: userId,
        action: 'SUBMIT_TO_PEMBINA',
        ipHash,
        metadata: { submittedAt: now.toISOString() },
      },
    }),
  ]);

  log.info('Review submitted to Pembina', { reviewId, userId });

  // Notify Pembina (non-blocking)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, fullName: true },
  });
  const submitterName = user?.displayName ?? user?.fullName ?? 'SC';
  notifySubmittedWaitingPembina(
    reviewId,
    review.organizationId,
    review.cohortId,
    review.quarterNumber,
    submitterName
  ).catch(() => {});
}

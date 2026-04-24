/**
 * src/lib/triwulan/pdf/job-queue.ts
 * NAWASENA M14 — Async PDF render job queue.
 *
 * Fetches review data from DB, renders PDF via renderer.tsx,
 * uploads to S3, and updates review pdfStatus.
 *
 * Retry: 3x with exponential backoff (5s, 10s, 20s).
 * On final failure: notifies SC + SUPERADMIN via M15.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { PDFStatus } from '@prisma/client';
import { renderTriwulanPDF } from './renderer';
import { uploadPDF } from './upload';
import { generateKPIBarChart } from './chart-generator';
import { notifyPDFExportFailed } from '../escalation/notifier';
import { setPDFQueueFunction } from '../audit-substansi/service';

const log = createLogger('m14/pdf/job-queue');

const MAX_RETRIES = 3;
const BACKOFF_SECONDS = [5, 10, 20];

// In-memory job set to prevent duplicate processing (per process)
const processingSet = new Set<string>();

/**
 * Enqueue a PDF render job for a review.
 * Fire-and-forget — runs in background without blocking.
 */
export function enqueuePDFRender(reviewId: string): void {
  if (processingSet.has(reviewId)) {
    log.warn('PDF render already queued for this review', { reviewId });
    return;
  }

  log.info('Enqueuing PDF render job', { reviewId });
  processingSet.add(reviewId);

  // Start async (no await — fire and forget)
  void runWithRetry(reviewId, 0).finally(() => {
    processingSet.delete(reviewId);
  });
}

/**
 * Run the PDF render job with retry logic.
 */
async function runWithRetry(reviewId: string, attempt: number): Promise<void> {
  if (attempt > 0) {
    const delaySecs = BACKOFF_SECONDS[attempt - 1] ?? 20;
    log.info(`PDF render retry ${attempt}/${MAX_RETRIES} — waiting ${delaySecs}s`, { reviewId });
    await sleep(delaySecs * 1000);
  }

  try {
    await renderAndStore(reviewId);
  } catch (err) {
    log.error(`PDF render attempt ${attempt + 1} failed`, { error: err, reviewId });

    if (attempt + 1 < MAX_RETRIES) {
      return runWithRetry(reviewId, attempt + 1);
    }

    // Final failure — mark as FAILED + notify
    log.error('PDF render exhausted all retries', { reviewId });
    await markFailed(reviewId);

    // Notify (non-blocking) — fetch minimal review data for notification
    prisma.triwulanReview.findUnique({
      where: { id: reviewId },
      select: { organizationId: true, cohortId: true, quarterNumber: true },
    }).then((rev) => {
      if (rev) {
        notifyPDFExportFailed(
          reviewId,
          rev.organizationId,
          rev.cohortId,
          rev.quarterNumber,
          String(err),
          MAX_RETRIES
        ).catch(() => {});
      }
    }).catch(() => {});
  }
}

/**
 * Fetch review data, render PDF, upload, update DB.
 */
async function renderAndStore(reviewId: string): Promise<void> {
  log.info('Starting PDF render', { reviewId });

  // Mark as RENDERING
  await prisma.triwulanReview.updateMany({
    where: { id: reviewId, pdfStatus: { in: [PDFStatus.PENDING, PDFStatus.FAILED] } },
    data: { pdfStatus: PDFStatus.RENDERING },
  });

  // Fetch full review data
  const review = await prisma.triwulanReview.findUnique({
    where: { id: reviewId },
    include: {
      cohort: { select: { code: true, name: true } },
      organization: { select: { name: true } },
      auditSubstansiResults: {
        orderBy: { itemKey: 'asc' },
        include: {
          assessedBy: { select: { displayName: true, fullName: true } },
        },
      },
      signatureEvents: {
        orderBy: { timestamp: 'asc' },
        include: {
          actor: { select: { displayName: true, fullName: true } },
        },
      },
    },
  });

  if (!review) {
    throw new Error(`Review not found: ${reviewId}`);
  }

  const snap = (review.dataSnapshotJsonb ?? {}) as Record<string, unknown>;
  const kpiChartData = generateKPIBarChart(snap.kpi as Record<string, unknown> | null);

  const input = {
    reviewId: review.id,
    quarterNumber: review.quarterNumber,
    cohortCode: review.cohort.code,
    cohortName: review.cohort.name,
    orgName: review.organization.name,
    generatedAt: review.generatedAt?.toISOString() ?? new Date().toISOString(),
    executiveSummary: review.executiveSummary,
    escalationLevel: review.escalationLevel,
    dataSnapshotJsonb: snap,
    auditSubstansiResults: review.auditSubstansiResults.map((r) => ({
      itemKey: r.itemKey,
      coverage: r.coverage,
      notes: r.notes,
      assessedBy: r.assessedBy
        ? { displayName: r.assessedBy.displayName, fullName: r.assessedBy.fullName }
        : null,
      assessedAt: r.assessedAt?.toISOString() ?? null,
    })),
    signatureEvents: review.signatureEvents.map((e) => ({
      action: e.action,
      actorDisplayName: e.actor?.displayName ?? null,
      actorFullName: e.actor?.fullName ?? null,
      notes: e.notes,
      createdAt: e.timestamp.toISOString(),
    })),
    kpiChartData,
  };

  // Render PDF
  const buffer = await renderTriwulanPDF(input);

  // Upload to S3
  const storageKey = await uploadPDF(reviewId, buffer);

  // Update review with READY status + storage key
  await prisma.triwulanReview.update({
    where: { id: reviewId },
    data: {
      pdfStatus: PDFStatus.READY,
      pdfStorageKey: storageKey,
    },
  });

  log.info('PDF render complete', { reviewId, storageKey, bytes: buffer.length });
}

async function markFailed(reviewId: string): Promise<void> {
  try {
    await prisma.triwulanReview.update({
      where: { id: reviewId },
      data: { pdfStatus: PDFStatus.FAILED },
    });
  } catch (err) {
    log.error('Failed to mark PDF as FAILED', { error: err, reviewId });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Wire up the PDF queue function to the audit-substansi service
// (avoids circular dependency — service holds a reference to this fn)
setPDFQueueFunction(enqueuePDFRender);

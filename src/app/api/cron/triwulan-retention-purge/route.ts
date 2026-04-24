/**
 * src/app/api/cron/triwulan-retention-purge/route.ts
 * NAWASENA M14 — Monthly cron: purge old superseded triwulan reviews.
 *
 * Retention policy:
 *   - Superseded reviews older than RETENTION_DAYS (default 365) are purged.
 *   - PDF in S3 is deleted first, then DB row is deleted.
 *   - DRY_RUN mode (default ON) — only reports what would be deleted.
 *
 * Schedule: 0 2 1 * * (09:00 WIB 1st of month = 02:00 UTC)
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { deletePDF } from '@/lib/triwulan/pdf/upload';

const log = createLogger('m14/cron/retention-purge');

const DEFAULT_RETENTION_DAYS = 365;
const DRY_RUN_DEFAULT = true;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    log.warn('Unauthorized retention-purge cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestId = `cron-purge-${Date.now()}`;

  // Parse dry-run from query params
  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') !== 'false' && DRY_RUN_DEFAULT;
  const retentionDays = parseInt(
    url.searchParams.get('retentionDays') ?? String(DEFAULT_RETENTION_DAYS),
    10
  );

  log.info('Retention purge cron triggered', { requestId, dryRun, retentionDays });

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  let purgedCount = 0;
  let pdfDeletedCount = 0;
  const errors: string[] = [];

  try {
    // Find superseded reviews older than cutoff
    const candidates = await prisma.triwulanReview.findMany({
      where: {
        supersededByReviewId: { not: null },
        createdAt: { lte: cutoff },
      },
      select: {
        id: true,
        organizationId: true,
        quarterNumber: true,
        cohortId: true,
        pdfStorageKey: true,
        createdAt: true,
      },
      take: 100, // process in batches
    });

    log.info('Retention purge candidates found', {
      count: candidates.length,
      dryRun,
      cutoff: cutoff.toISOString(),
    });

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        candidatesFound: candidates.length,
        wouldDelete: candidates.map((c) => ({
          id: c.id,
          organizationId: c.organizationId,
          quarterNumber: c.quarterNumber,
          createdAt: c.createdAt.toISOString(),
          hasPDF: !!c.pdfStorageKey,
        })),
      });
    }

    // Not dry-run: actually purge
    for (const review of candidates) {
      try {
        // Delete PDF from S3 first
        if (review.pdfStorageKey) {
          try {
            await deletePDF(review.pdfStorageKey);
            pdfDeletedCount++;
          } catch (s3Err) {
            log.error('S3 PDF delete failed — continuing with DB delete', {
              error: s3Err,
              reviewId: review.id,
              key: review.pdfStorageKey,
            });
            errors.push(`S3 delete failed for ${review.id}: ${String(s3Err)}`);
          }
        }

        // Delete signature events first (FK constraint)
        await prisma.triwulanSignatureEvent.deleteMany({
          where: { reviewId: review.id },
        });

        // Delete audit substansi results
        await prisma.auditSubstansiResult.deleteMany({
          where: { reviewId: review.id },
        });

        // Delete review row
        await prisma.triwulanReview.delete({
          where: { id: review.id },
        });

        purgedCount++;
        log.info('Review purged', { reviewId: review.id, quarterNumber: review.quarterNumber });
      } catch (err) {
        log.error('Failed to purge review', { error: err, reviewId: review.id });
        errors.push(`Failed to purge ${review.id}: ${String(err)}`);
      }
    }

    log.info('Retention purge cron completed', {
      requestId,
      candidatesFound: candidates.length,
      purgedCount,
      pdfDeletedCount,
      errorCount: errors.length,
    });

    return NextResponse.json({
      ok: true,
      dryRun: false,
      candidatesFound: candidates.length,
      purgedCount,
      pdfDeletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    log.error('Retention purge cron failed', { error: err, requestId });
    return NextResponse.json({ error: 'Cron failed', detail: String(err) }, { status: 500 });
  }
}

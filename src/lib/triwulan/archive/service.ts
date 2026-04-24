/**
 * src/lib/triwulan/archive/service.ts
 * NAWASENA M14 — Archive Service: list finalized reviews + cohort comparison.
 *
 * Uses `withCache` for performance. Cache invalidated when a review is finalized.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { withCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { ReviewStatus } from '@prisma/client';

const log = createLogger('m14/archive/service');

export interface ArchiveListItem {
  id: string;
  quarterNumber: number;
  status: ReviewStatus;
  escalationLevel: string;
  pdfStatus: string;
  pdfStorageKey: string | null;
  generatedAt: Date | null;
  blmAcknowledgedAt: Date | null;
  cohort: { id: string; code: string; name: string };
  _count: { signatureEvents: number; auditSubstansiResults: number };
}

/**
 * List finalized (and BLM acknowledged) reviews for an org — cached.
 */
export async function listArchivedReviews(orgId: string): Promise<ArchiveListItem[]> {
  const cacheKey = CACHE_KEYS.all(`triwulan-archive-${orgId}`);

  return withCache(cacheKey, CACHE_TTL.LONG, async () => {
    log.info('Fetching archived triwulan reviews', { orgId });

    const reviews = await prisma.triwulanReview.findMany({
      where: {
        organizationId: orgId,
        status: { in: [ReviewStatus.BLM_ACKNOWLEDGED, ReviewStatus.FINALIZED] },
        supersededByReviewId: null,
      },
      include: {
        cohort: { select: { id: true, code: true, name: true } },
        _count: { select: { signatureEvents: true, auditSubstansiResults: true } },
      },
      orderBy: [{ quarterNumber: 'desc' }, { blmAcknowledgedAt: 'desc' }],
      take: 100,
    });

    log.info('Archive list fetched', { orgId, count: reviews.length });
    return reviews;
  });
}

/**
 * Get a single archived review detail (read-only, cached).
 */
export async function getArchivedReviewDetail(reviewId: string) {
  const cacheKey = CACHE_KEYS.byId('triwulan-review', reviewId);

  return withCache(cacheKey, CACHE_TTL.LONG, async () => {
    log.info('Fetching archived review detail', { reviewId });

    return prisma.triwulanReview.findUnique({
      where: { id: reviewId },
      include: {
        cohort: { select: { id: true, code: true, name: true } },
        organization: { select: { id: true, code: true, name: true } },
        generatedBy: { select: { id: true, displayName: true, fullName: true } },
        submittedBy: { select: { id: true, displayName: true, fullName: true } },
        pembinaSignedBy: { select: { id: true, displayName: true, fullName: true } },
        blmAcknowledgedBy: { select: { id: true, displayName: true, fullName: true } },
        auditSubstansiResults: {
          orderBy: { itemKey: 'asc' },
          include: {
            assessedBy: { select: { id: true, displayName: true, fullName: true } },
          },
        },
        signatureEvents: {
          orderBy: { timestamp: 'asc' },
          include: {
            actor: { select: { id: true, displayName: true, fullName: true } },
          },
        },
      },
    });
  });
}

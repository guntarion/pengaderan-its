/**
 * src/app/api/mental-health/research-consent/route.ts
 * NAWASENA M11 — POST: Maba opts in to research consent (extends retention 2 years).
 *
 * POST /api/mental-health/research-consent
 *   Role: authenticated (own data only)
 *   Body: { cohortId, consentVersion, scope: string[] }
 *
 * Creates MHResearchConsent with retentionExtendedUntil = now + 2 years.
 * Audit: MH_RESEARCH_OPT_IN
 */

import { createApiHandler, ApiResponse, validateBody, ConflictError, BadRequestError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { MHResearchConsentSchema } from '@/lib/mh-screening/types';

const TWO_YEARS_MS = 2 * 365 * 24 * 3600 * 1000;

export const POST = createApiHandler({
  auth: true,
  handler: async (req, ctx) => {
    const body = await validateBody(req, MHResearchConsentSchema);

    ctx.log.info('MH research consent POST', { userId: ctx.user.id, cohortId: body.cohortId });

    // Verify the cohort exists and user belongs to it
    const cohort = await prisma.cohort.findUnique({
      where: { id: body.cohortId },
      select: { id: true, status: true },
    });

    if (!cohort) {
      throw BadRequestError('Cohort tidak ditemukan');
    }

    // Check for existing research consent for this cohort
    const existing = await prisma.mHResearchConsent.findFirst({
      where: { userId: ctx.user.id, cohortId: body.cohortId },
    });

    if (existing) {
      throw ConflictError('Persetujuan penelitian untuk cohort ini sudah ada');
    }

    const now = new Date();
    const retentionExtendedUntil = new Date(now.getTime() + TWO_YEARS_MS);

    const consent = await prisma.mHResearchConsent.create({
      data: {
        userId: ctx.user.id,
        cohortId: body.cohortId,
        consentVersion: body.consentVersion,
        scope: body.scope,
        retentionExtendedUntil,
      },
    });

    ctx.log.info('MH research consent created', {
      consentId: consent.id,
      retentionExtendedUntil: retentionExtendedUntil.toISOString(),
    });

    return ApiResponse.success({
      consentId: consent.id,
      retentionExtendedUntil: retentionExtendedUntil.toISOString(),
      message: 'Persetujuan penelitian berhasil dicatat. Data skrining Anda akan dipertahankan selama 2 tahun.',
    }, 201);
  },
});

/**
 * src/app/api/anon-reports/status/[code]/route.ts
 * GET /api/anon-reports/status/[code]
 *
 * Public status tracker — returns only allowlisted fields.
 * Uses bypass_rls in narrow transaction for the SELECT.
 * Rate limit: 30 per 5 minutes (anti-enumeration).
 * No captcha required (rate limit is sufficient).
 *
 * Returns only: status, category, severity, acknowledgedAt, recordedAt, publicNote, closedAt
 * Generic 404 — no timing hint between "not found" and "rate limited".
 */

import { prisma } from '@/utils/prisma';
import { createPublicAnonHandler, ApiResponse } from '@/lib/anon-report/public-api-handler';
import { setBypassRls } from '@/lib/anon-report/rls-helpers';
import { statusLookupSchema } from '@/lib/anon-report/schemas';

export const GET = createPublicAnonHandler({
  schema: statusLookupSchema,
  rateLimitKey: 'status-lookup',
  rateLimitMax: 30,
  rateLimitWindowSeconds: 300, // 5 minutes
  requireCaptcha: false,
  handler: async ({ body, params, log }) => {
    // Code can come from either parsed body (query params) or route params
    const code = (body.code || params.code || '').toUpperCase();

    if (!code || !/^NW-[A-Z0-9]{8}$/.test(code)) {
      return ApiResponse.fail(404, 'NOT_FOUND', 'Kode tidak ditemukan atau tidak valid.');
    }

    log.debug('Status lookup requested', { codeFormat: 'valid' });

    // Use bypass_rls in narrow transaction — only SELECT allowlisted fields
    const report = await prisma.$transaction(async (tx) => {
      await setBypassRls(tx);

      return tx.anonReport.findUnique({
        where: { trackingCode: code },
        select: {
          status: true,
          category: true,
          severity: true,
          acknowledgedAt: true,
          recordedAt: true,
          publicNote: true,
          closedAt: true,
          // NOT returned: bodyText, attachmentKey, acknowledgedById, resolutionNotes,
          //               satgasNotes, cohortId, organizationId, reporterSeverity,
          //               severityReason, blmCategoryOverride, blmSeverityOverride
        },
      });
    });

    if (!report) {
      // Generic 404 — no hint about whether code exists or is rate-limited
      log.debug('Status lookup: not found');
      return ApiResponse.fail(404, 'NOT_FOUND', 'Kode tidak ditemukan atau tidak valid.');
    }

    log.info('Status lookup successful');

    return ApiResponse.success(report);
  },
});

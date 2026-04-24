/**
 * src/app/api/anon-reports/route.ts
 *
 * POST /api/anon-reports — Public anonymous report submission
 *   Uses createPublicAnonHandler (no session/CSRF, captcha + rate limit)
 *   Returns { trackingCode, status: 'NEW' }
 *
 * GET /api/anon-reports — BLM/SUPERADMIN list with filters
 *   Uses createApiHandler({ roles: ['BLM', 'SUPERADMIN'] })
 *   RLS enforces org scoping for BLM
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { createPublicAnonHandler } from '@/lib/anon-report/public-api-handler';
import { submitSchema } from '@/lib/anon-report/schemas';
import { createTrackingCode } from '@/lib/anon-report/tracking-code';
import { isProbablyLowQuality } from '@/lib/anon-report/profanity';
import { classifySeverity } from '@/lib/anon-report/severity-classifier';
import { setBypassRls, setAnonSessionVars } from '@/lib/anon-report/rls-helpers';
import { escalateToSatgas } from '@/lib/anon-report/escalation';
import { z } from 'zod';
import { AnonStatus } from '@prisma/client';

// ============================================================
// POST — Public submit (no auth)
// ============================================================

export const POST = createPublicAnonHandler({
  schema: submitSchema,
  rateLimitKey: 'submit',
  rateLimitMax: 5,
  rateLimitWindowSeconds: 86400, // 24 hours
  requireCaptcha: true,
  handler: async ({ body, log }) => {
    log.info('Anon report submit received', {
      category: body.category,
      hasAttachment: !!body.attachmentTmpKey,
    });

    // Step 1: Check for low-quality content
    const qualityCheck = isProbablyLowQuality(body.bodyText);
    if (qualityCheck.rejected) {
      log.info('Report rejected: low quality', { reason: qualityCheck.reason });
      return ApiResponse.fail(400, 'BAD_REQUEST', qualityCheck.message ?? 'Laporan tidak memenuhi syarat minimum.');
    }

    // Step 2: Resolve organization from cohort
    const cohort = await prisma.cohort.findUnique({
      where: { id: body.cohortId },
      select: { id: true, organizationId: true, status: true },
    });

    if (!cohort) {
      return ApiResponse.fail(400, 'BAD_REQUEST', 'Kohort tidak ditemukan.');
    }

    if (cohort.status !== 'ACTIVE') {
      return ApiResponse.fail(400, 'BAD_REQUEST', 'Kohort tidak aktif.');
    }

    // Step 3: Classify severity
    const classification = classifySeverity(body.bodyText, body.reporterSeverity ?? null, body.category);

    log.info('Severity classified', {
      finalSeverity: classification.finalSeverity,
      autoEscalate: classification.autoEscalate,
    });

    // Step 4: Create report in transaction with bypass_rls
    const report = await prisma.$transaction(async (tx) => {
      await setBypassRls(tx);

      const trackingCode = await createTrackingCode(tx);

      const created = await tx.anonReport.create({
        data: {
          trackingCode,
          cohortId: body.cohortId,
          organizationId: cohort.organizationId,
          category: body.category,
          bodyText: body.bodyText,
          reporterSeverity: body.reporterSeverity ?? null,
          severity: classification.finalSeverity,
          severityReason: classification.reason,
          status: AnonStatus.NEW,
          attachmentKey: body.attachmentTmpKey
            ? body.attachmentTmpKey.replace('anon/uploads/', `anon/reports/pending/`)
            : null,
        },
        select: {
          id: true,
          trackingCode: true,
          status: true,
          severity: true,
          satgasEscalated: true,
        },
      });

      return created;
    });

    log.info('Anon report created', {
      reportId: report.id.slice(0, 8) + '...',
      status: report.status,
    });

    // Step 5: Async escalation + BLM notification (fire and forget)
    // escalateToSatgas handles: M15 CRITICAL notif → fallback SMTP → update flags
    if (classification.autoEscalate) {
      setImmediate(() => {
        escalateToSatgas(report.id, log).catch((escalateErr) => {
          log.error('Auto-escalation failed', { error: escalateErr });
        });
      });
    }

    return ApiResponse.success(
      {
        trackingCode: report.trackingCode,
        status: report.status,
      },
      201,
    );
  },
});

// ============================================================
// GET — BLM/SUPERADMIN list (authenticated, org-scoped via RLS)
// ============================================================

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  category: z.string().optional(),
  severity: z.string().optional(),
  cohortId: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const GET = createApiHandler({
  roles: ['BLM', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    log.info('Fetching anon reports list', { role: user.role });

    const query = validateQuery(req, listQuerySchema);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { status, category, severity, cohortId, sortOrder } = query;

    await prisma.$transaction(async (tx) => {
      await setAnonSessionVars(tx, user);
    });

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (cohortId) where.cohortId = cohortId;

    // Use a transaction with RLS session vars for the actual query
    const [reports, total] = await prisma.$transaction(async (tx) => {
      await setAnonSessionVars(tx, user);

      const [items, count] = await Promise.all([
        tx.anonReport.findMany({
          where,
          select: {
            id: true,
            // Mask tracking code in list — show only last 4 chars
            trackingCode: true,
            cohortId: true,
            organizationId: true,
            category: true,
            severity: true,
            status: true,
            satgasEscalated: true,
            acknowledgedAt: true,
            recordedAt: true,
            updatedAt: true,
            closedAt: true,
          },
          orderBy: { recordedAt: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        tx.anonReport.count({ where }),
      ]);

      return [items, count];
    });

    // Mask tracking code in list view
    const maskedReports = reports.map((r) => ({
      ...r,
      trackingCode: `NW-****${r.trackingCode.slice(-4)}`,
    }));

    return ApiResponse.paginated(maskedReports, { page, limit, total });
  },
});

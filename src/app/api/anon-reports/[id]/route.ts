/**
 * src/app/api/anon-reports/[id]/route.ts
 *
 * GET  /api/anon-reports/[id] — Detail view (BLM/Satgas/SUPERADMIN, audited)
 * PATCH /api/anon-reports/[id] — Update notes/severity override (audited)
 *
 * MANDATORY: All protected access MUST call recordAnonAccess() in same transaction.
 * ESLint custom rule enforces this import.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema, NotFoundError } from '@/lib/api';
import { setAnonSessionVars } from '@/lib/anon-report/rls-helpers';
import { recordAnonAccess } from '@/lib/anon-report/access-log'; // MANDATORY — do not remove
import { patchReportSchema } from '@/lib/anon-report/schemas';
import { AnonAccessAction } from '@prisma/client';

// ============================================================
// GET — Detail view
// ============================================================

export const GET = createApiHandler({
  roles: ['BLM', 'SATGAS_PPKPT', 'SUPERADMIN'],
  handler: async (_req, { user, params, log }) => {
    const { id } = validateParams(params, idParamSchema);
    log.info('Fetching anon report detail', { role: user.role });

    const report = await prisma.$transaction(async (tx) => {
      await setAnonSessionVars(tx, user);

      const found = await tx.anonReport.findUnique({
        where: { id },
        select: {
          id: true,
          trackingCode: true,
          cohortId: true,
          organizationId: true,
          category: true,
          bodyText: true,
          bodyRedacted: true,
          attachmentKey: true,
          reporterSeverity: true,
          severity: true,
          severityReason: true,
          status: true,
          satgasEscalated: true,
          satgasEscalatedAt: true,
          acknowledgedById: true,
          acknowledgedAt: true,
          closedAt: true,
          resolutionNotes: user.role !== 'SC' ? true : false,
          publicNote: true,
          satgasNotes: user.role === 'SATGAS_PPKPT' || user.role === 'SUPERADMIN' ? true : false,
          blmCategoryOverride: true,
          blmSeverityOverride: true,
          recordedAt: true,
          updatedAt: true,
        },
      });

      if (!found) throw NotFoundError('Laporan');

      // Mandatory audit entry in SAME transaction
      await recordAnonAccess(tx, user, found.id, AnonAccessAction.READ);

      return found;
    });

    return ApiResponse.success(report);
  },
});

// ============================================================
// PATCH — Update (notes, severity override)
// ============================================================

export const PATCH = createApiHandler({
  roles: ['BLM', 'SATGAS_PPKPT', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id } = validateParams(params, idParamSchema);
    const data = await validateBody(req, patchReportSchema);

    log.info('Updating anon report', { role: user.role });

    const updated = await prisma.$transaction(async (tx) => {
      await setAnonSessionVars(tx, user);

      const existing = await tx.anonReport.findUnique({
        where: { id },
        select: { id: true, severity: true, category: true, publicNote: true },
      });

      if (!existing) throw NotFoundError('Laporan');

      // Build audit meta with before/after
      const meta: Record<string, unknown> = {};
      if (data.blmSeverityOverride !== undefined) {
        meta.severityBefore = existing.severity;
        meta.severityAfter = data.blmSeverityOverride;
      }
      if (data.blmCategoryOverride !== undefined) {
        meta.categoryBefore = existing.category;
        meta.categoryAfter = data.blmCategoryOverride;
      }

      // Determine which access action to log
      const action: AnonAccessAction = data.blmSeverityOverride
        ? AnonAccessAction.SEVERITY_OVERRIDE
        : data.blmCategoryOverride
          ? AnonAccessAction.CATEGORY_OVERRIDE
          : AnonAccessAction.UPDATE;

      const result = await tx.anonReport.update({
        where: { id },
        data: {
          ...(data.blmSeverityOverride ? { blmSeverityOverride: data.blmSeverityOverride, severity: data.blmSeverityOverride } : {}),
          ...(data.blmCategoryOverride ? { blmCategoryOverride: data.blmCategoryOverride } : {}),
          ...(data.publicNote !== undefined ? { publicNote: data.publicNote } : {}),
          ...(data.satgasNotes !== undefined && (user.role === 'SATGAS_PPKPT' || user.role === 'SUPERADMIN')
            ? { satgasNotes: data.satgasNotes }
            : {}),
        },
      });

      // Mandatory audit entry in SAME transaction
      await recordAnonAccess(tx, user, id, action, meta);

      return result;
    });

    return ApiResponse.success(updated);
  },
});

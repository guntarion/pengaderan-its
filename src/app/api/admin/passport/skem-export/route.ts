/**
 * src/app/api/admin/passport/skem-export/route.ts
 * NAWASENA M05 — GET: Preview or stream SKEM CSV.
 *
 * Query params:
 *   cohortId  (required)
 *   preview   (optional boolean) — return JSON if true
 *   kpGroupId, dateFrom, dateTo (optional filters)
 *
 * Without preview: returns streaming CSV with Content-Disposition header.
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateQuery,
  NotFoundError,
} from '@/lib/api';
import { generatePreview, generateSkemCsv } from '@/lib/passport/skem-export.service';
import { AuditAction } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const querySchema = z.object({
  cohortId: z.string().min(1),
  preview: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  kpGroupId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  dimensi: z.string().optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const query = validateQuery(req, querySchema as Parameters<typeof validateQuery>[1]) as z.infer<typeof querySchema>;

    // Validate cohort
    const cohort = await prisma.cohort.findUnique({ where: { id: query.cohortId } });
    if (!cohort) throw NotFoundError('Cohort');

    const filter = {
      kpGroupId: query.kpGroupId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      dimensi: query.dimensi,
    };

    if (query.preview) {
      log.info('SKEM preview requested', { cohortId: query.cohortId });
      const rows = await generatePreview(query.cohortId, filter);
      return ApiResponse.success(rows);
    }

    // Full CSV export
    log.info('SKEM CSV export requested', { cohortId: query.cohortId, userId: user.id });

    const { csv, rowCount, checksumSha256 } = await generateSkemCsv(query.cohortId, filter);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `skem-export-${cohort.code}-${timestamp}.csv`;

    // Log export
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });

    if (fullUser) {
      await prisma.passportSkemExportLog.create({
        data: {
          organizationId: fullUser.organizationId,
          cohortId: query.cohortId,
          generatedByUserId: user.id,
          rowCount,
          filterJson: filter as object,
          csvChecksumSha256: checksumSha256,
        },
      }).catch((err) => log.warn('Failed to create SKEM export log', { error: err }));

      await prisma.nawasenaAuditLog.create({
        data: {
          organizationId: fullUser.organizationId,
          action: AuditAction.SKEM_EXPORT_GENERATED,
          actorUserId: user.id,
          entityType: 'Cohort',
          entityId: query.cohortId,
          metadata: { rowCount, checksumSha256, filename },
        },
      }).catch((err) => log.warn('Failed to create audit log for SKEM export', { error: err }));
    }

    // Return as streaming CSV response
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Row-Count': rowCount.toString(),
      },
    });
  },
});

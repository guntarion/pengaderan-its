/**
 * src/app/api/mental-health/aggregate/export/route.ts
 * NAWASENA M11 — CSV export for MH aggregate data (admin-only).
 *
 * GET /api/mental-health/aggregate/export?cohortId=...&phase=F1
 *   Role: SC, PEMBINA, BLM, SATGAS, SUPERADMIN
 *   Returns: CSV with cell-floor masked rows.
 *   Masked cells exported as "<5" (not the actual value).
 *   Audit log: EXPORT_AGGREGATE (via aggregateSeverityPerKPGroup).
 *
 * PRIVACY-CRITICAL:
 *   - CSV NEVER contains individual user data.
 *   - Masked cells MUST export as "<5" not null.
 *   - Every export is audited via withMHBypass inside aggregate fn.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler, validateQuery } from '@/lib/api';
import { aggregateSeverityPerKPGroup } from '@/lib/mh-screening/aggregate';
import { z } from 'zod';
import type { UserRole } from '@prisma/client';

const exportQuerySchema = z.object({
  cohortId: z.string().min(1, 'cohortId required'),
  phase: z.enum(['F1', 'F4']).default('F1'),
});

const ADMIN_ROLES = ['SC', 'PEMBINA', 'BLM', 'SATGAS', 'SUPERADMIN'];

export const GET = createApiHandler({
  roles: ADMIN_ROLES,
  handler: async (req: NextRequest, { user, log }) => {
    const { cohortId, phase: rawPhase } = validateQuery(req, exportQuerySchema);
    const phase = (rawPhase as 'F1' | 'F4') ?? 'F1';

    log.info('MH aggregate CSV export', { cohortId, phase, actorId: user.id });

    const rows = await aggregateSeverityPerKPGroup(
      cohortId as string,
      phase,
      {
        id: user.id,
        role: user.role as UserRole,
        organizationId: (user as { organizationId?: string }).organizationId,
      },
    );

    // Build CSV — masked cells use "<5" notation
    const csvLines = [
      'kpGroupId,severity,phase,count',
      ...rows.map((r) => [
        r.kpGroupId ?? '(tidak terdaftar)',
        r.severity,
        r.phase,
        r.masked ? '<5' : String(r.count),
      ].join(',')),
    ];

    const csv = csvLines.join('\n');
    const filename = `mh-aggregate-${cohortId}-${phase}-${new Date().toISOString().split('T')[0]}.csv`;

    log.info('MH aggregate CSV exported', {
      cohortId,
      phase,
      rowCount: rows.length,
      maskedCount: rows.filter((r) => r.masked).length,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
});

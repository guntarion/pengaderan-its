/**
 * /api/admin/cohorts
 * GET  — list cohorts for org (SC, SUPERADMIN, PEMBINA, BLM, SATGAS, ELDER)
 * POST — create cohort (SC, SUPERADMIN)
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { BadRequestError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const createCohortSchema = z.object({
  code: z.string().min(1).max(20).transform((v) => v.toUpperCase()),
  name: z.string().min(2).max(200),
  startDate: z.string().datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' }),
  endDate: z.string().datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' }),
  description: z.string().max(500).optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN', 'PEMBINA', 'BLM', 'SATGAS', 'ELDER'],
  handler: async (_req, { user, log }) => {
    const orgId = user.organizationId ?? '';
    if (!orgId) throw BadRequestError('organizationId tidak ditemukan');
    log.info('Fetching cohorts', { orgId });

    const cohorts = await prisma.cohort.findMany({
      where: user.role === 'SUPERADMIN' ? {} : { organizationId: orgId },
      orderBy: [{ startDate: 'desc' }, { code: 'asc' }],
      select: {
        id: true, code: true, name: true, status: true,
        isActive: true, startDate: true, endDate: true, createdAt: true,
        _count: { select: { users: true } },
      },
    });
    return ApiResponse.success(cohorts);
  },
});

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, createCohortSchema);
    const orgId = user.organizationId ?? '';
    if (!orgId) throw BadRequestError('organizationId tidak ditemukan');

    log.info('Creating cohort', { orgId, code: body.code });

    const cohort = await prisma.cohort.create({
      data: {
        code: body.code,
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        organizationId: orgId,
        createdBy: user.id,
        status: 'DRAFT',
        isActive: false,
      },
    });

    await logAudit({
      action: AuditAction.COHORT_CREATE,
      organizationId: orgId,
      actorUserId: user.id,
      entityType: 'Cohort',
      entityId: cohort.id,
      afterValue: { code: cohort.code, name: cohort.name },
    });

    return ApiResponse.success(cohort, 201);
  },
});

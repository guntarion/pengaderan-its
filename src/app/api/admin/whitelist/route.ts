/**
 * /api/admin/whitelist
 * GET  — list whitelist entries
 * POST — add whitelist entry
 *
 * Roles: SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { BadRequestError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const addWhitelistSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  preassignedRole: z.enum([
    'MABA', 'KP', 'KASUH', 'OC', 'ELDER', 'SC',
    'PEMBINA', 'BLM', 'SATGAS', 'ALUMNI', 'DOSEN_WALI',
  ]),
  preassignedCohortId: z.string().optional(),
  note: z.string().max(500).optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN', 'PEMBINA'],
  handler: async (req, { user, log }) => {
    const orgId = user.organizationId ?? '';
    if (!orgId) throw BadRequestError('organizationId tidak ditemukan');
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const showConsumed = searchParams.get('showConsumed') === 'true';

    log.info('Fetching whitelist', { orgId });

    const where = {
      organizationId: orgId,
      ...(!showConsumed && { isConsumed: false }),
    };

    const [entries, total] = await Promise.all([
      prisma.whitelistEmail.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, email: true, preassignedRole: true, isConsumed: true,
          consumedAt: true, note: true, createdAt: true,
          preassignedCohort: { select: { code: true, name: true } },
        },
      }),
      prisma.whitelistEmail.count({ where }),
    ]);

    return ApiResponse.paginated(entries, { page, limit, total });
  },
});

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, addWhitelistSchema);
    const orgId = user.organizationId ?? '';
    if (!orgId) throw BadRequestError('organizationId tidak ditemukan');

    log.info('Adding whitelist entry', { orgId, email: body.email });

    // Upsert to avoid duplicate errors
    const entry = await prisma.whitelistEmail.upsert({
      where: { organizationId_email: { organizationId: orgId, email: body.email } },
      update: {
        preassignedRole: body.preassignedRole,
        preassignedCohortId: body.preassignedCohortId,
        note: body.note,
        isConsumed: false,
        consumedAt: null,
      },
      create: {
        organizationId: orgId,
        email: body.email,
        preassignedRole: body.preassignedRole,
        preassignedCohortId: body.preassignedCohortId,
        note: body.note,
        addedBy: user.id,
      },
    });

    await logAudit({
      action: AuditAction.WHITELIST_ADD,
      organizationId: orgId,
      actorUserId: user.id,
      entityType: 'WhitelistEmail',
      entityId: entry.id,
      afterValue: { email: body.email, role: body.preassignedRole },
    });

    return ApiResponse.success(entry, 201);
  },
});

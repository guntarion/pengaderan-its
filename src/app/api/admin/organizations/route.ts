/**
 * /api/admin/organizations
 * GET  — list organizations (SUPERADMIN only)
 * POST — create organization (SUPERADMIN only)
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const createOrgSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  name: z.string().min(2).max(100),
  fullName: z.string().min(5).max(300),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const GET = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (_req, { log }) => {
    log.info('Fetching all organizations');
    const orgs = await prisma.organization.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, code: true, name: true, fullName: true,
        status: true, createdAt: true,
        _count: { select: { users: true, cohorts: true } },
      },
    });
    return ApiResponse.success(orgs);
  },
});

export const POST = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, createOrgSchema);
    log.info('Creating organization', { code: body.code });

    const org = await prisma.organization.create({
      data: {
        ...body,
        status: 'ACTIVE',
      },
    });

    await logAudit({
      action: AuditAction.ORG_CREATE,
      actorUserId: user.id,
      entityType: 'Organization',
      entityId: org.id,
      afterValue: { code: org.code, name: org.name },
    });

    return ApiResponse.success(org, 201);
  },
});

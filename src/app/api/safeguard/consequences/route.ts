/**
 * src/app/api/safeguard/consequences/route.ts
 * NAWASENA M10 — Consequence log list (GET) and assign (POST).
 *
 * GET  /api/safeguard/consequences — SC/SG-Officer list all consequences in org
 * POST /api/safeguard/consequences — Assign a consequence to a maba/KP
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateBody,
  validateQuery,
} from '@/lib/api';
import { z } from 'zod';
import { ConsequenceType, ConsequenceStatus } from '@prisma/client';
import { createConsequenceLog } from '@/lib/safeguard/consequences/assign';
import type { IncidentActor } from '@/lib/safeguard/types';

// ---- Zod: create consequence ----

const createConsequenceSchema = z
  .object({
    organizationId: z.string().min(1),
    cohortId: z.string().min(1),
    targetUserId: z.string().min(1),
    type: z.nativeEnum(ConsequenceType),
    reasonText: z.string().min(30, 'reasonText minimal 30 karakter'),
    relatedIncidentId: z.string().optional(),
    deadline: z.string().datetime().optional(),
    pointsDeducted: z.number().int().positive().optional(),
    forbiddenActCode: z.string().optional(),
  })
  .refine(
    (data) => {
      // POIN_PASSPORT requires pointsDeducted
      if (data.type === ConsequenceType.POIN_PASSPORT_DIKURANGI) {
        return !!data.pointsDeducted;
      }
      return true;
    },
    { message: 'pointsDeducted wajib untuk POIN_PASSPORT_DIKURANGI', path: ['pointsDeducted'] },
  )
  .refine(
    (data) => {
      // Deadline required for REFLEKSI, PRESENTASI_ULANG, TUGAS_PENGABDIAN
      const requiresDeadline: ConsequenceType[] = [
        ConsequenceType.REFLEKSI_500_KATA,
        ConsequenceType.PRESENTASI_ULANG,
        ConsequenceType.TUGAS_PENGABDIAN,
      ];
      if (requiresDeadline.includes(data.type)) {
        return !!data.deadline;
      }
      return true;
    },
    {
      message: 'deadline wajib untuk REFLEKSI_500_KATA, PRESENTASI_ULANG, atau TUGAS_PENGABDIAN',
      path: ['deadline'],
    },
  );

// ---- Query schema for GET ----

const listQuerySchema = z.object({
  status: z.nativeEnum(ConsequenceStatus).optional(),
  type: z.nativeEnum(ConsequenceType).optional(),
  cohortId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ---- GET /api/safeguard/consequences ----

export const GET = createApiHandler({
  roles: ['SC', 'PEMBINA'],
  handler: async (req, ctx) => {
    ctx.log.info('Listing consequences');

    const q = listQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    const { page, limit, status, type, cohortId } = q;

    const user = ctx.user as unknown as { organizationId?: string; isSafeguardOfficer?: boolean };
    const orgId = user.organizationId;
    if (!orgId) {
      return ApiResponse.success([]);
    }

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(cohortId ? { cohortId } : {}),
    };

    const [consequences, total] = await Promise.all([
      prisma.consequenceLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, displayName: true } },
          assignedBy: { select: { id: true, fullName: true, displayName: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.consequenceLog.count({ where }),
    ]);

    return ApiResponse.paginated(consequences, { page, limit, total });
  },
});

// ---- POST /api/safeguard/consequences ----

export const POST = createApiHandler({
  roles: ['SC', 'OC', 'KP'],
  handler: async (req, ctx) => {
    const body = await validateBody(req, createConsequenceSchema);

    const rawUser = ctx.user as unknown as {
      id: string;
      role: string;
      organizationId?: string;
      isSafeguardOfficer?: boolean;
    };

    const actor: IncidentActor = {
      id: rawUser.id,
      role: rawUser.role as IncidentActor['role'],
      isSafeguardOfficer: rawUser.isSafeguardOfficer ?? false,
      organizationId: rawUser.organizationId ?? body.organizationId,
    };

    ctx.log.info('Creating consequence', {
      type: body.type,
      targetUserId: body.targetUserId,
      actorId: actor.id,
    });

    const consequence = await createConsequenceLog(
      {
        ...body,
        deadline: body.deadline ? new Date(body.deadline) : undefined,
      },
      actor,
      {
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    );

    return ApiResponse.success(consequence, 201);
  },
});

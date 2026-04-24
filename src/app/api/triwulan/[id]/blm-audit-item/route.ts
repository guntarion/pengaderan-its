/**
 * src/app/api/triwulan/[id]/blm-audit-item/route.ts
 * NAWASENA M14
 *   GET  /api/triwulan/[id]/blm-audit-item — list all 10 audit items with current results
 *   PATCH /api/triwulan/[id]/blm-audit-item — upsert one audit item coverage
 *
 * Roles: BLM (SUPERADMIN can read)
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema } from '@/lib/api';
import { z } from 'zod';
import { upsertAuditItem, listAuditItems } from '@/lib/triwulan/audit-substansi/service';
import { hashRequestIP } from '@/lib/triwulan/signature/ip-hasher';
import { MuatanWajibKey, MuatanCoverageStatus } from '@prisma/client';

export const GET = createApiHandler({
  roles: ['BLM', 'SUPERADMIN'],
  handler: async (_req, ctx) => {
    const { id: reviewId } = validateParams(ctx.params, idParamSchema);
    ctx.log.info('Listing audit items', { reviewId, userId: ctx.user.id });
    const items = await listAuditItems(reviewId);
    return ApiResponse.success(items);
  },
});

const auditItemSchema = z.object({
  itemKey: z.nativeEnum(MuatanWajibKey),
  coverage: z.nativeEnum(MuatanCoverageStatus),
  evidenceRef: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const PATCH = createApiHandler({
  roles: ['BLM'],
  handler: async (req, ctx) => {
    const { id: reviewId } = validateParams(ctx.params, idParamSchema);
    const body = await validateBody(req, auditItemSchema);

    ctx.log.info('BLM upserting audit item', {
      reviewId,
      itemKey: body.itemKey,
      coverage: body.coverage,
      userId: ctx.user.id,
    });

    const ipHash = hashRequestIP(req.headers);
    await upsertAuditItem({
      reviewId,
      itemKey: body.itemKey,
      coverage: body.coverage,
      evidenceRef: body.evidenceRef,
      notes: body.notes,
      userId: ctx.user.id,
      orgId: ctx.user.organizationId!,
      ipHash,
    });

    return ApiResponse.success({ updated: true });
  },
});

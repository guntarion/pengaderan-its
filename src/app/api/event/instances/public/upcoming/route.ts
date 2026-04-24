/**
 * GET /api/event/instances/public/upcoming
 * Public — no auth required.
 * Returns upcoming instances for a Kegiatan (next 30 days).
 * Query: kegiatanId (required), orgCode (optional, defaults from env).
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api';
import { getPublicUpcomingForKegiatan } from '@/lib/event/services/instance.service';
import { z } from 'zod';

const querySchema = z.object({
  kegiatanId: z.string().min(1),
  orgCode: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const kegiatanId = url.searchParams.get('kegiatanId');
    const orgCode = url.searchParams.get('orgCode') ?? process.env.TENANT_ORG_CODE;

    const parsed = querySchema.safeParse({ kegiatanId, orgCode });
    if (!parsed.success) {
      return ApiResponse.fail(400, 'VALIDATION_ERROR', 'kegiatanId is required');
    }

    const instances = await getPublicUpcomingForKegiatan(
      parsed.data.kegiatanId,
      parsed.data.orgCode,
    );

    return ApiResponse.success(instances);
  } catch {
    return ApiResponse.fail(500, 'INTERNAL_ERROR', 'Failed to fetch instances');
  }
}

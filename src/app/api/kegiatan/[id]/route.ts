/**
 * src/app/api/kegiatan/[id]/route.ts
 * Public API — GET /api/kegiatan/[id]
 * No auth required. Returns full kegiatan detail.
 */

import { type NextRequest } from 'next/server';
import { ApiResponse, NotFoundError } from '@/lib/api';
import { getKegiatanDetail } from '@/lib/master-data/services/kegiatan.service';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:kegiatan-detail');

const VALID_ID_PATTERN = /^[A-Z][A-Z0-9]*\.[0-9]+$/;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!id || !VALID_ID_PATTERN.test(id)) {
    throw NotFoundError('Kegiatan');
  }

  log.info('Public detail request', { id });

  const kegiatan = await getKegiatanDetail(id, null);
  if (!kegiatan) {
    throw NotFoundError('Kegiatan');
  }

  return ApiResponse.success(kegiatan);
}

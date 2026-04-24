/**
 * src/app/api/kegiatan/route.ts
 * Public API — GET /api/kegiatan
 * No auth required. Returns filtered catalog kegiatan.
 */

import { type NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api';
import { getCatalogKegiatan } from '@/lib/master-data/services/kegiatan.service';
import { createLogger } from '@/lib/logger';
import type { FaseKey, KategoriKey, NilaiKey, KegiatanIntensity, KegiatanScale } from '@prisma/client';

const log = createLogger('api:kegiatan');

function parseCSV<T>(val: string | null): T[] | undefined {
  if (!val) return undefined;
  const arr = val.split(',').filter(Boolean);
  return arr.length > 0 ? (arr as T[]) : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const fase = parseCSV<FaseKey>(searchParams.get('fase'));
    const kategori = parseCSV<KategoriKey>(searchParams.get('kategori'));
    const nilai = parseCSV<NilaiKey>(searchParams.get('nilai'));
    const intensity = parseCSV<KegiatanIntensity>(searchParams.get('intensity'));
    const scale = parseCSV<KegiatanScale>(searchParams.get('scale'));
    const org = searchParams.get('org');

    log.info('Public catalog request', { org, filters: { fase, kategori, nilai, intensity, scale } });

    const items = await getCatalogKegiatan(org, { fase, kategori, nilai, intensity, scale });

    return ApiResponse.success({ items, total: items.length });
  } catch (err) {
    log.error('Catalog query failed', { error: err });
    return ApiResponse.success({ items: [], total: 0 });
  }
}

/**
 * src/lib/master-data/services/kegiatan.service.ts
 * Service functions for querying Kegiatan (activity catalog).
 * Includes withCache wrapping + RLS context setting.
 */

import { prisma } from '@/utils/prisma';
import { withCache } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import type { FaseKey, KategoriKey, NilaiKey, KegiatanIntensity, KegiatanScale } from '@prisma/client';
import { MASTER_CACHE_KEYS, MASTER_CACHE_TTL } from '../cache/keys';

const log = createLogger('kegiatan-service');

export interface CatalogFilters {
  fase?: FaseKey[];
  kategori?: KategoriKey[];
  nilai?: NilaiKey[];
  intensity?: KegiatanIntensity[];
  scale?: KegiatanScale[];
}

// Default org code for public catalog (no session)
const DEFAULT_ORG_CODE = process.env.TENANT_ORG_CODE ?? 'HMTC';

/**
 * Get default org ID for public catalog (cached in memory for performance).
 */
let cachedDefaultOrgId: string | null = null;
async function getDefaultOrgId(): Promise<string | null> {
  if (cachedDefaultOrgId) return cachedDefaultOrgId;
  const org = await prisma.organization.findUnique({
    where: { code: DEFAULT_ORG_CODE },
    select: { id: true },
  });
  if (org) cachedDefaultOrgId = org.id;
  return cachedDefaultOrgId;
}

/**
 * Fetch catalog kegiatan with filters.
 * Uses withCache for Redis caching.
 * Sets RLS context for tenant isolation.
 */
export async function getCatalogKegiatan(
  orgCode: string | null,
  filters: CatalogFilters = {},
): Promise<
  Array<{
    id: string;
    nama: string;
    deskripsiSingkat: string;
    nilai: string;
    dimensi: string;
    fase: string;
    kategori: string;
    intensity: string;
    scale: string;
    durasiMenit: number;
    frekuensi: string;
    isActive: boolean;
    isGlobal: boolean;
    organizationId: string | null;
    _count: { tujuan: number; kpiDefs: number };
  }>
> {
  const effectiveOrgCode = orgCode ?? DEFAULT_ORG_CODE;

  log.info('Getting catalog kegiatan', { orgCode: effectiveOrgCode, filters });

  return withCache(
    MASTER_CACHE_KEYS.kegiatanCatalog(effectiveOrgCode, filters as Record<string, unknown>),
    MASTER_CACHE_TTL.CATALOG,
    async () => {
      const orgId = orgCode
        ? (await prisma.organization.findUnique({ where: { code: orgCode }, select: { id: true } }))?.id
        : await getDefaultOrgId();

      const where = {
        isActive: true,
        AND: [
          // RLS equivalent at app level: global OR org-scoped
          {
            OR: [
              { isGlobal: true },
              ...(orgId ? [{ organizationId: orgId }] : []),
            ],
          },
          // Apply filters
          ...(filters.fase?.length ? [{ fase: { in: filters.fase } }] : []),
          ...(filters.kategori?.length ? [{ kategori: { in: filters.kategori } }] : []),
          ...(filters.nilai?.length ? [{ nilai: { in: filters.nilai } }] : []),
          ...(filters.intensity?.length ? [{ intensity: { in: filters.intensity } }] : []),
          ...(filters.scale?.length ? [{ scale: { in: filters.scale } }] : []),
        ],
      };

      const items = await prisma.kegiatan.findMany({
        where,
        orderBy: [{ fase: 'asc' }, { displayOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          nama: true,
          deskripsiSingkat: true,
          nilai: true,
          dimensi: true,
          fase: true,
          kategori: true,
          intensity: true,
          scale: true,
          durasiMenit: true,
          frekuensi: true,
          isActive: true,
          isGlobal: true,
          organizationId: true,
          _count: { select: { tujuan: true, kpiDefs: true } },
        },
      });

      log.info('Catalog kegiatan fetched', { count: items.length });
      return items;
    },
  );
}

/**
 * Get full kegiatan detail with all relations.
 */
export async function getKegiatanDetail(id: string, orgCode: string | null = null) {
  const effectiveOrgCode = orgCode ?? DEFAULT_ORG_CODE;

  log.info('Getting kegiatan detail', { id, orgCode: effectiveOrgCode });

  return withCache(
    MASTER_CACHE_KEYS.kegiatanDetail(id),
    MASTER_CACHE_TTL.DETAIL,
    async () => {
      const orgId = orgCode
        ? (await prisma.organization.findUnique({ where: { code: orgCode }, select: { id: true } }))?.id
        : await getDefaultOrgId();

      const kegiatan = await prisma.kegiatan.findFirst({
        where: {
          id,
          isActive: true,
          OR: [
            { isGlobal: true },
            ...(orgId ? [{ organizationId: orgId }] : []),
          ],
        },
        include: {
          tujuan: { orderBy: { ordinal: 'asc' } },
          kpiDefs: { orderBy: { id: 'asc' } },
          anchors: { orderBy: { id: 'asc' } },
          passportItems: { orderBy: { ordinal: 'asc' } },
          organization: { select: { code: true, name: true } },
        },
      });

      if (!kegiatan) {
        log.info('Kegiatan not found or inactive', { id });
        return null;
      }

      log.info('Kegiatan detail fetched', { id });
      return kegiatan;
    },
  );
}

/**
 * Toggle kegiatan isActive flag (admin operation).
 */
export async function toggleKegiatanActive(
  id: string,
  isActive: boolean,
  actorId: string,
): Promise<{ id: string; isActive: boolean }> {
  log.info('Toggling kegiatan active state', { id, isActive, actorId });

  const updated = await prisma.kegiatan.update({
    where: { id },
    data: { isActive },
    select: { id: true, isActive: true },
  });

  log.info('Kegiatan active state toggled', { id, isActive });
  return updated;
}

/**
 * src/lib/master-data/services/taxonomy.service.ts
 * Service functions for TaxonomyMeta (bilingual labels).
 */

import { prisma } from '@/utils/prisma';
import { withCache } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import type { TaxonomyGroup } from '@prisma/client';
import { MASTER_CACHE_KEYS, MASTER_CACHE_TTL } from '../cache/keys';
import { invalidateTaxonomy, invalidateCatalog } from '../cache/invalidate';

const log = createLogger('taxonomy-service');

export async function getTaxonomyMeta(group?: TaxonomyGroup) {
  const cacheKey = group
    ? `taxonomy:meta:${group.toLowerCase()}`
    : MASTER_CACHE_KEYS.taxonomyMeta();

  return withCache(cacheKey, MASTER_CACHE_TTL.TAXONOMY, async () => {
    log.info('Fetching taxonomy meta', { group });
    return prisma.taxonomyMeta.findMany({
      where: group ? { group } : undefined,
      orderBy: [{ group: 'asc' }, { displayOrder: 'asc' }],
    });
  });
}

/**
 * Update a single TaxonomyMeta entry (SUPERADMIN only).
 * Invalidates taxonomy cache + catalog cache (labels shown in catalog).
 */
export async function updateTaxonomyMeta(
  key: string,
  data: { labelId?: string; labelEn?: string; deskripsi?: string },
  actorId: string,
) {
  log.info('Updating taxonomy meta', { key, actorId });

  const existing = await prisma.taxonomyMeta.findUnique({ where: { id: key } });
  if (!existing) {
    return null;
  }

  const updated = await prisma.taxonomyMeta.update({
    where: { id: key },
    data: {
      ...(data.labelId !== undefined ? { labelId: data.labelId } : {}),
      ...(data.labelEn !== undefined ? { labelEn: data.labelEn } : {}),
      ...(data.deskripsi !== undefined ? { deskripsi: data.deskripsi } : {}),
    },
  });

  // Invalidate caches — taxonomy labels appear in catalog badges
  await invalidateTaxonomy();
  await invalidateCatalog();

  log.info('Taxonomy meta updated', { key });
  return updated;
}

/**
 * Build a lookup map from taxonomy key → TaxonomyMeta for fast badge rendering.
 */
export async function getTaxonomyLookup(): Promise<Map<string, { labelId: string; labelEn: string; deskripsi: string | null }>> {
  const all = await getTaxonomyMeta();
  const map = new Map<string, { labelId: string; labelEn: string; deskripsi: string | null }>();
  for (const item of all) {
    map.set(item.id, { labelId: item.labelId, labelEn: item.labelEn, deskripsi: item.deskripsi });
  }
  return map;
}

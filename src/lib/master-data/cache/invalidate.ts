/**
 * src/lib/master-data/cache/invalidate.ts
 * Cache invalidation helpers for master data.
 */

import { invalidateCache } from '@/lib/cache';
import { revalidatePath } from 'next/cache';
import { createLogger } from '@/lib/logger';
import { MASTER_CACHE_KEYS } from './keys';

const log = createLogger('master-data:cache');

/** Invalidate catalog list cache (after Kegiatan toggle or re-seed). */
export async function invalidateCatalog(orgCode?: string): Promise<void> {
  if (orgCode) {
    // Invalidate all filter variants for this org
    await invalidateCache(`catalog:kegiatan:${orgCode}:*`);
  } else {
    await invalidateCache(MASTER_CACHE_KEYS.patterns.catalog());
  }
  try {
    revalidatePath('/kegiatan');
  } catch {
    // revalidatePath may not be available in all contexts
  }
  log.info('Catalog cache invalidated', { orgCode: orgCode ?? 'all' });
}

/** Invalidate single kegiatan detail cache. */
export async function invalidateDetail(id: string): Promise<void> {
  await invalidateCache(MASTER_CACHE_KEYS.kegiatanDetail(id));
  try {
    revalidatePath(`/kegiatan/${id}`);
  } catch {
    // revalidatePath may not be available in all contexts
  }
  log.info('Kegiatan detail cache invalidated', { id });
}

/** Invalidate taxonomy meta cache. */
export async function invalidateTaxonomy(): Promise<void> {
  await invalidateCache(MASTER_CACHE_KEYS.patterns.taxonomy());
  log.info('Taxonomy cache invalidated');
}

/** Invalidate a specific reference type. */
export async function invalidateReference(
  type: 'forbidden-acts' | 'safeguard' | 'rubrik' | 'form-inventory' | 'role-permissions' | 'passport',
): Promise<void> {
  await invalidateCache(`reference:${type}:*`);
  log.info('Reference cache invalidated', { type });
}

/** Invalidate everything — used after full re-seed. */
export async function invalidateAll(): Promise<void> {
  const patterns = MASTER_CACHE_KEYS.patterns.all();
  for (const pattern of patterns) {
    await invalidateCache(pattern);
  }
  try {
    revalidatePath('/kegiatan');
    revalidatePath('/referensi');
  } catch {
    // revalidatePath may not be available in all contexts
  }
  log.info('All master data caches invalidated');
}

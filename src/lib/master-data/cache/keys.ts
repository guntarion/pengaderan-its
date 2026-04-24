/**
 * src/lib/master-data/cache/keys.ts
 * Cache key constants for M02 master data entities.
 */

import * as crypto from 'crypto';

/** Cache TTL in seconds for master data (read-heavy, changes rarely). */
export const MASTER_CACHE_TTL = {
  CATALOG: 3600,   // 1 hour — catalog list
  DETAIL: 3600,    // 1 hour — kegiatan detail
  TAXONOMY: 7200,  // 2 hours — taxonomy labels
  REFERENCE: 7200, // 2 hours — reference data (forbidden acts, safeguard, etc.)
} as const;

/** Stable hash of filter object for cache key differentiation. */
function filterHash(filters: Record<string, unknown>): string {
  const sorted = Object.keys(filters)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = filters[key];
      return acc;
    }, {});
  return crypto.createHash('sha1').update(JSON.stringify(sorted)).digest('hex').slice(0, 8);
}

/** Cache key constants for M02. */
export const MASTER_CACHE_KEYS = {
  /** Catalog list for an org + filter combination */
  kegiatanCatalog: (orgCode: string, filters: Record<string, unknown>) =>
    `catalog:kegiatan:${orgCode}:${filterHash(filters)}`,

  /** Single kegiatan detail */
  kegiatanDetail: (id: string) => `kegiatan:detail:${id}`,

  /** All taxonomy metadata */
  taxonomyMeta: () => 'taxonomy:meta:all',

  /** All forbidden acts */
  forbiddenActs: () => 'reference:forbidden-acts:all',

  /** All safeguard protocols */
  safeguardProtocols: () => 'reference:safeguard:all',

  /** All rubrik */
  rubrikList: () => 'reference:rubrik:all',

  /** Form inventory */
  formInventory: () => 'reference:form-inventory:all',

  /** Role permissions */
  rolePermissions: () => 'reference:role-permissions:all',

  /** Passport items by dimensi */
  passportItems: (dimensi?: string) =>
    dimensi ? `reference:passport:${dimensi}` : 'reference:passport:all',

  // Invalidation patterns
  patterns: {
    catalog: () => 'catalog:kegiatan:*',
    detail: (id?: string) => id ? `kegiatan:detail:${id}` : 'kegiatan:detail:*',
    taxonomy: () => 'taxonomy:*',
    reference: () => 'reference:*',
    all: () => ['catalog:kegiatan:*', 'kegiatan:detail:*', 'taxonomy:*', 'reference:*'],
  },
};

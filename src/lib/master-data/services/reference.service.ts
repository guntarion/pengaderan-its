/**
 * src/lib/master-data/services/reference.service.ts
 * Service functions for querying global reference data.
 */

import { prisma } from '@/utils/prisma';
import { withCache } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { MASTER_CACHE_KEYS, MASTER_CACHE_TTL } from '../cache/keys';

const log = createLogger('reference-service');

export async function getForbiddenActs() {
  return withCache(MASTER_CACHE_KEYS.forbiddenActs(), MASTER_CACHE_TTL.REFERENCE, async () => {
    log.info('Fetching forbidden acts');
    return prisma.forbiddenAct.findMany({ orderBy: { ordinal: 'asc' } });
  });
}

export async function getSafeguardProtocols() {
  return withCache(MASTER_CACHE_KEYS.safeguardProtocols(), MASTER_CACHE_TTL.REFERENCE, async () => {
    log.info('Fetching safeguard protocols');
    return prisma.safeguardProtocol.findMany({ orderBy: { ordinal: 'asc' } });
  });
}

export async function getRubrikList() {
  return withCache(MASTER_CACHE_KEYS.rubrikList(), MASTER_CACHE_TTL.REFERENCE, async () => {
    log.info('Fetching rubrik list');
    return prisma.rubrik.findMany({ orderBy: [{ rubrikKey: 'asc' }, { level: 'asc' }] });
  });
}

export async function getFormInventory() {
  return withCache(MASTER_CACHE_KEYS.formInventory(), MASTER_CACHE_TTL.REFERENCE, async () => {
    log.info('Fetching form inventory');
    return prisma.formInventory.findMany({ orderBy: { id: 'asc' } });
  });
}

export async function getRolePermissions() {
  return withCache(MASTER_CACHE_KEYS.rolePermissions(), MASTER_CACHE_TTL.REFERENCE, async () => {
    log.info('Fetching role permissions');
    return prisma.rolePermission.findMany({ orderBy: [{ role: 'asc' }, { resource: 'asc' }] });
  });
}

export async function getPassportItems(dimensi?: string) {
  return withCache(MASTER_CACHE_KEYS.passportItems(dimensi), MASTER_CACHE_TTL.REFERENCE, async () => {
    log.info('Fetching passport items', { dimensi });
    return prisma.passportItem.findMany({
      where: dimensi ? { dimensi: dimensi as import('@prisma/client').DimensiKey } : undefined,
      orderBy: [{ dimensi: 'asc' }, { ordinal: 'asc' }],
    });
  });
}

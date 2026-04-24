/**
 * src/lib/pulse/service.ts
 * NAWASENA M04 — Pulse Harian service.
 *
 * Core operations:
 * - createPulse: upsert PulseCheck with dedup on (userId, localDate)
 * - bulkSyncPulse: batch upsert from offline queue (max 30)
 * - getLastNPulse: last N pulses for trend / red-flag check
 * - getOwnTrend: aggregated trend for chart display
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { getLocalDateString, localDateStringToDate, getOrgTimezone } from './local-date';

const log = createLogger('pulse-service');

export interface CreatePulseInput {
  userId: string;
  organizationId: string;
  cohortId: string;
  mood: number;        // 1-5
  emoji: string;
  comment?: string | null;
  recordedAt: Date;    // UTC client time
  clientTempId?: string | null;
  timezone?: string;   // org timezone, default 'Asia/Jakarta'
}

export interface PulseSyncItem extends CreatePulseInput {
  clientTempId: string;
}

export interface PulseSyncResult {
  clientTempId: string;
  serverId?: string;
  status: 'OK' | 'DUPLICATE' | 'REJECTED_TOO_OLD';
}

/**
 * Create or update a PulseCheck (last-write-wins on same localDate).
 * Returns the created/updated pulse row.
 */
export async function createPulse(input: CreatePulseInput) {
  const timezone = input.timezone ?? 'Asia/Jakarta';
  const localDateStr = getLocalDateString(input.recordedAt, timezone);
  const localDate = localDateStringToDate(localDateStr);

  log.info('Creating pulse', {
    userId: input.userId,
    mood: input.mood,
    localDate: localDateStr,
  });

  const pulse = await prisma.pulseCheck.upsert({
    where: {
      userId_localDate: {
        userId: input.userId,
        localDate,
      },
    },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      cohortId: input.cohortId,
      mood: input.mood,
      emoji: input.emoji,
      comment: input.comment ?? null,
      recordedAt: input.recordedAt,
      localDate,
      syncedAt: new Date(),
      clientTempId: input.clientTempId ?? null,
    },
    update: {
      // Last-write-wins — update fields on duplicate localDate
      mood: input.mood,
      emoji: input.emoji,
      comment: input.comment ?? null,
      recordedAt: input.recordedAt,
      syncedAt: new Date(),
      clientTempId: input.clientTempId ?? null,
    },
  });

  log.info('Pulse created/updated', { pulseId: pulse.id, userId: input.userId });
  return pulse;
}

/**
 * Bulk sync pulses from offline queue (max 30 items per call).
 * Rejects items older than 7 days.
 * Returns per-item status for client-side queue cleanup.
 */
export async function bulkSyncPulse(
  items: PulseSyncItem[],
  maxItems = 30,
): Promise<PulseSyncResult[]> {
  const limited = items.slice(0, maxItems);
  const results: PulseSyncResult[] = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  log.info('Bulk syncing pulse', { count: limited.length });

  for (const item of limited) {
    // Reject items older than 7 days
    if (item.recordedAt < sevenDaysAgo) {
      log.warn('Rejecting pulse — too old', {
        clientTempId: item.clientTempId,
        recordedAt: item.recordedAt,
      });
      results.push({ clientTempId: item.clientTempId, status: 'REJECTED_TOO_OLD' });
      continue;
    }

    try {
      const pulse = await createPulse(item);
      results.push({ clientTempId: item.clientTempId, serverId: pulse.id, status: 'OK' });
    } catch (err) {
      // P2002 = unique constraint — already synced via another path
      const errorCode = (err as { code?: string }).code;
      if (errorCode === 'P2002') {
        results.push({ clientTempId: item.clientTempId, status: 'DUPLICATE' });
      } else {
        log.error('Failed to sync pulse item', { clientTempId: item.clientTempId, error: err });
        // Don't rethrow — continue with remaining items
        results.push({ clientTempId: item.clientTempId, status: 'DUPLICATE' });
      }
    }
  }

  log.info('Bulk sync complete', {
    synced: results.filter((r) => r.status === 'OK').length,
    duplicates: results.filter((r) => r.status === 'DUPLICATE').length,
    rejected: results.filter((r) => r.status === 'REJECTED_TOO_OLD').length,
  });

  return results;
}

/**
 * Get the last N pulses for a user (newest first).
 * Used by red-flag engine and trend display.
 */
export async function getLastNPulse(userId: string, n: number) {
  return prisma.pulseCheck.findMany({
    where: { userId },
    orderBy: { recordedAt: 'desc' },
    take: n,
  });
}

/**
 * Get pulse trend data for a user over the last N days.
 * Returns array ordered by recordedAt ascending for chart display.
 */
export async function getOwnTrend(userId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return prisma.pulseCheck.findMany({
    where: {
      userId,
      recordedAt: { gte: since },
    },
    orderBy: { recordedAt: 'asc' },
    select: {
      id: true,
      mood: true,
      emoji: true,
      comment: true,
      recordedAt: true,
      localDate: true,
    },
  });
}

/**
 * Get today's pulse for a user (by localDate).
 * Returns null if user hasn't checked in today.
 */
export async function getTodayPulse(
  userId: string,
  timezone = 'Asia/Jakarta',
): Promise<{ id: string; mood: number; emoji: string } | null> {
  const today = getLocalDateString(new Date(), timezone);
  const localDate = localDateStringToDate(today);

  const pulse = await prisma.pulseCheck.findUnique({
    where: { userId_localDate: { userId, localDate } },
    select: { id: true, mood: true, emoji: true },
  });

  return pulse;
}

/**
 * Get organization timezone from org settings.
 * Falls back to 'Asia/Jakarta'.
 */
export async function getOrgTimezoneByOrgId(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  return getOrgTimezone(org?.settings);
}

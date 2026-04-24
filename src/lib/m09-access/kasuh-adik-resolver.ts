/**
 * src/lib/m09-access/kasuh-adik-resolver.ts
 * NAWASENA M09 — Kasuh adik asuh access resolver.
 *
 * Enforces pair-level access control: Kasuh can only access pulse data
 * for their active adik asuh (KasuhPair with status=ACTIVE).
 *
 * All bypass RLS reads are audited via KASUH_PULSE_READ.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { ForbiddenError } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import type { KasuhPair } from '@prisma/client';

const log = createLogger('m09:kasuh-adik-resolver');

/**
 * List all active adik asuh (KasuhPair) for a Kasuh user.
 */
export async function listAdikAsuh(kasuhUserId: string): Promise<KasuhPair[]> {
  log.debug('Listing adik asuh', { kasuhUserId });

  return prisma.kasuhPair.findMany({
    where: {
      kasuhUserId,
      status: 'ACTIVE',
    },
    include: {
      maba: {
        select: {
          id: true,
          fullName: true,
          displayName: true,
          image: true,
          nrp: true,
        },
      },
    },
  });
}

/**
 * Check if a Kasuh can access pulse data for a specific Maba.
 * Returns true only if there's an ACTIVE pair between them.
 */
export async function canAccessAdikPulse(
  kasuhUserId: string,
  mabaUserId: string,
): Promise<boolean> {
  const pair = await prisma.kasuhPair.findFirst({
    where: {
      kasuhUserId,
      mabaUserId,
      status: 'ACTIVE',
    },
    select: { id: true },
  });

  return !!pair;
}

export interface PulseTrendData {
  pulseChecks: Array<{
    date: string;
    mood: number;
    emoji: string;
  }>;
  avgMood: number | null;
}

/**
 * Get pulse trend for a specific adik asuh.
 * Requires valid ACTIVE pair; throws ForbiddenError if not authorized.
 * Audits KASUH_PULSE_READ on every call.
 */
export async function getAdikPulseTrend(
  kasuhUserId: string,
  mabaUserId: string,
  days: number = 14,
): Promise<PulseTrendData> {
  log.debug('Getting adik pulse trend', { kasuhUserId, mabaUserId, days });

  // Verify pair authorization
  const pair = await prisma.kasuhPair.findFirst({
    where: {
      kasuhUserId,
      mabaUserId,
      status: 'ACTIVE',
    },
    select: { id: true, organizationId: true, cohortId: true },
  });

  if (!pair) {
    log.warn('Unauthorized pulse access attempt', { kasuhUserId, mabaUserId });
    throw ForbiddenError('Tidak memiliki akses ke data pulse adik asuh ini');
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  // Query pulse checks (no RLS bypass needed — this is own-data query through validated pair)
  const pulseChecks = await prisma.pulseCheck.findMany({
    where: {
      userId: mabaUserId,
      localDate: { gte: since },
    },
    select: {
      localDate: true,
      mood: true,
      emoji: true,
    },
    orderBy: { localDate: 'asc' },
  });

  // Audit the access
  await auditLog.record({
    userId: kasuhUserId,
    action: 'KASUH_PULSE_READ',
    resource: 'PulseCheck',
    resourceId: mabaUserId,
    metadata: {
      pairId: pair.id,
      mabaUserId,
      days,
      pulseCount: pulseChecks.length,
    },
  });

  const avgMood =
    pulseChecks.length > 0
      ? Math.round(
          (pulseChecks.reduce((sum, p) => sum + p.mood, 0) / pulseChecks.length) * 10,
        ) / 10
      : null;

  return {
    pulseChecks: pulseChecks.map((p) => ({
      date: p.localDate.toISOString().split('T')[0],
      mood: p.mood,
      emoji: p.emoji,
    })),
    avgMood,
  };
}

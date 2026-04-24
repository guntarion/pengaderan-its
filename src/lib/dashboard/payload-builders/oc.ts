/**
 * src/lib/dashboard/payload-builders/oc.ts
 * Dashboard payload builder for OC (Organizing Committee) role.
 *
 * Gathers: upcoming events as PIC, pending evaluations, recent NPS.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import type { OCDashboardPayload } from '@/types/dashboard';

const log = createLogger('m13/payload-builder/oc');

export async function buildOCDashboard(
  userId: string,
  cohortId: string,
  _organizationId: string,
): Promise<OCDashboardPayload> {
  const start = Date.now();
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [upcomingInstances, pendingEvalCount, recentNPSInstances] = await Promise.all([
    // Upcoming events where PIC hint matches OC role or user is noted
    prisma.kegiatanInstance.findMany({
      where: {
        cohortId,
        scheduledAt: { gte: now, lte: future },
        status: { in: ['PLANNED', 'RUNNING'] },
      },
      select: {
        id: true,
        scheduledAt: true,
        location: true,
        kegiatan: { select: { nama: true } },
        rsvps: {
          where: { userId },
          select: { status: true },
          take: 1,
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    }),

    // Pending evaluations: DONE instances without evaluation
    prisma.kegiatanInstance.count({
      where: {
        cohortId,
        status: 'DONE',
        evaluation: null,
      },
    }),

    // Recent NPS: instances DONE in last 30d with NPS entries
    prisma.kegiatanInstance.findMany({
      where: {
        cohortId,
        status: 'DONE',
        executedAt: { gte: thirtyDaysAgo },
        npsEntries: { some: {} },
      },
      select: {
        id: true,
        kegiatan: { select: { nama: true } },
        npsEntries: {
          select: { npsScore: true },
        },
      },
      orderBy: { executedAt: 'desc' },
      take: 5,
    }),
  ]);

  const upcomingEventsAsPIC = upcomingInstances.map((inst) => ({
    id: inst.id,
    title: inst.kegiatan.nama,
    startTime: inst.scheduledAt,
    location: inst.location ?? undefined,
    rsvpStatus: inst.rsvps[0]?.status,
  }));

  const recentNPS = recentNPSInstances.map((inst) => {
    const avgNps = inst.npsEntries.length > 0
      ? inst.npsEntries.reduce((s, e) => s + e.npsScore, 0) / inst.npsEntries.length
      : 0;
    return {
      eventId: inst.id,
      eventName: inst.kegiatan.nama,
      avgNps: Math.round(avgNps * 10) / 10,
      count: inst.npsEntries.length,
    };
  });

  log.debug('OC payload built', { userId, cohortId, durationMs: Date.now() - start });

  return {
    userId,
    cohortId,
    upcomingEventsAsPIC,
    evaluationPending: pendingEvalCount,
    recentNPS,
  };
}

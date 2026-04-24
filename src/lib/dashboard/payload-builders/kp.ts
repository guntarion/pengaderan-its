/**
 * src/lib/dashboard/payload-builders/kp.ts
 * Dashboard payload builder for KP (Kelompok Pendamping) role.
 *
 * Gathers: mood heatmap for KP group, active red flags, debrief reminder, passport review queue.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { getActiveAlertCount } from '@/lib/dashboard/aggregation/live-compute';
import type { KPDashboardPayload, AlertItem } from '@/types/dashboard';

const log = createLogger('m13/payload-builder/kp');

export async function buildKPDashboard(
  userId: string,
  cohortId: string,
  _organizationId: string,
): Promise<KPDashboardPayload> {
  const start = Date.now();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Find this KP's group
  const kpGroup = await prisma.kPGroup.findFirst({
    where: { kpCoordinatorUserId: userId, cohortId, status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  const [memberIds, activeAlerts, debriefLog, passportQueue] = await Promise.all([
    // Get KP group members (MABA)
    kpGroup
      ? prisma.kPGroupMember.findMany({
          where: { kpGroupId: kpGroup.id },
          select: { userId: true },
        }).then(async (members) => {
          const ids = members.map((m) => m.userId);
          const users = await prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, fullName: true },
          });
          return users;
        })
      : [],

    // Active red flags for this cohort targeting KP role
    prisma.redFlagAlert.findMany({
      where: {
        cohortId,
        status: 'ACTIVE',
        targetRoles: { has: 'KP' },
      },
      orderBy: [{ severity: 'desc' }, { firstSeenAt: 'asc' }],
      take: 10,
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        title: true,
        targetUrl: true,
        firstSeenAt: true,
        computedAt: true,
      },
    }),

    // Check last debrief date for this group
    kpGroup
      ? prisma.kPLogWeekly.findFirst({
          where: { kpGroupId: kpGroup.id, cohortId },
          orderBy: { submittedAt: 'desc' },
          select: { submittedAt: true },
        })
      : null,

    // Passport entries needing review (PENDING) for group members
    prisma.passportEntry.count({
      where: {
        cohortId,
        status: 'PENDING',
      },
    }),
  ]);

  // Build mood heatmap for members
  const moodHeatmap = await Promise.all(
    (Array.isArray(memberIds) ? memberIds : []).map(async (user: { id: string; fullName: string }) => {
      const pulses = await prisma.pulseCheck.findMany({
        where: { userId: user.id, recordedAt: { gte: sevenDaysAgo } },
        select: { mood: true },
        orderBy: { recordedAt: 'asc' },
      });
      return {
        userId: user.id,
        name: user.fullName ?? 'Unknown',
        scores: pulses.map((p) => p.mood),
      };
    }),
  );

  // Debrief reminder: if last debrief > 14 days ago
  const lastDebrief = debriefLog?.submittedAt;
  let debriefReminder: string | undefined;
  if (!lastDebrief || lastDebrief < fourteenDaysAgo) {
    debriefReminder = lastDebrief
      ? `Debrief terakhir: ${lastDebrief.toLocaleDateString('id-ID')}. Sudah lebih dari 14 hari.`
      : 'Belum ada debrief mingguan. Segera buat log debrief.';
  }

  const formattedAlerts: AlertItem[] = activeAlerts.map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity as AlertItem['severity'],
    status: a.status as AlertItem['status'],
    title: a.title,
    targetUrl: a.targetUrl,
    firstSeenAt: a.firstSeenAt.toISOString(),
    computedAt: a.computedAt.toISOString(),
  }));

  // Also get alert counts
  await getActiveAlertCount(cohortId);

  log.debug('KP payload built', {
    userId,
    cohortId,
    memberCount: moodHeatmap.length,
    alertCount: formattedAlerts.length,
    durationMs: Date.now() - start,
  });

  return {
    userId,
    cohortId,
    moodHeatmap,
    activeAlerts: formattedAlerts,
    debriefReminder,
    passportReviewQueue: passportQueue,
  };
}

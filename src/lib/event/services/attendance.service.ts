/**
 * src/lib/event/services/attendance.service.ts
 * NAWASENA M06 — Attendance stub service.
 *
 * V1: Minimal implementation — only query and stub mark.
 * M08 will add full UI and QR-scan-based marking.
 *
 * CONTRACT: This service only uses the 6 locked fields:
 *   id, instanceId, userId, organizationId, status, notedAt
 * M08 may extend with additional fields (checkInAt, notedById, etc.)
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import type { AttendanceStatus } from '@prisma/client';

const log = createLogger('event:attendance-service');

export interface AttendanceSummary {
  instanceId: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  total: number;
}

/**
 * Get attendance summary for an instance.
 * Used by M05 Passport evidence type ATTENDANCE and OC view.
 */
export async function getAttendanceSummary(instanceId: string): Promise<AttendanceSummary> {
  log.debug('Getting attendance summary', { instanceId });

  const counts = await prisma.attendance.groupBy({
    by: ['status'],
    where: { instanceId },
    _count: { status: true },
  });

  const summary: AttendanceSummary = {
    instanceId,
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
    total: 0,
  };

  for (const count of counts) {
    const n = count._count.status;
    summary.total += n;
    switch (count.status) {
      case 'HADIR': summary.hadir = n; break;
      case 'IZIN': summary.izin = n; break;
      case 'SAKIT': summary.sakit = n; break;
      case 'ALPA': summary.alpa = n; break;
    }
  }

  return summary;
}

/**
 * Get list of user IDs with HADIR status for an instance.
 * Used by NPS trigger to know who to notify.
 */
export async function getHadirUserIds(instanceId: string): Promise<string[]> {
  const attendances = await prisma.attendance.findMany({
    where: { instanceId, status: 'HADIR' },
    select: { userId: true },
  });
  return attendances.map((a) => a.userId);
}

/**
 * Mark or update attendance for a user on an instance (stub).
 * V1: basic create/update. Full QR-based marking in M08.
 */
export async function markAttendance(
  instanceId: string,
  userId: string,
  organizationId: string,
  status: AttendanceStatus,
): Promise<void> {
  log.info('Marking attendance (stub)', { instanceId, userId, status });

  await prisma.attendance.upsert({
    where: { instanceId_userId: { instanceId, userId } },
    create: {
      instanceId,
      userId,
      organizationId,
      status,
      notedAt: new Date(),
    },
    update: {
      status,
      notedAt: new Date(),
    },
  });

  // Audit log
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        action: 'ATTENDANCE_MARK',
        actorUserId: userId,
        entityType: 'Attendance',
        entityId: `${instanceId}-${userId}`,
        organizationId,
        afterValue: { status },
        metadata: { instanceId, userId, stub: true },
      },
    });
  } catch (err) {
    log.warn('Failed to create attendance audit log', { error: err });
  }
}

/**
 * Check if a user was marked as HADIR for an instance.
 * Used by NPS canSubmit guard.
 */
export async function wasHadir(instanceId: string, userId: string): Promise<boolean> {
  const attendance = await prisma.attendance.findUnique({
    where: { instanceId_userId: { instanceId, userId } },
    select: { status: true },
  });
  return attendance?.status === 'HADIR';
}

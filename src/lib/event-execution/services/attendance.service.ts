/**
 * src/lib/event-execution/services/attendance.service.ts
 * NAWASENA M08 — OC Attendance management service.
 *
 * - bulkMarkHadir: mark all CONFIRMED RSVPs as HADIR in one batch
 * - manualMark: OC set individual attendance status
 * - getAttendanceListForInstance: paginated attendance list (cached)
 * - autoSetAlpaOnDone: set remaining non-HADIR as ALPA on DONE transition
 * - getAttendanceStats: aggregate counts (cached)
 */

import { prisma } from '@/utils/prisma';
import { withCache, CACHE_TTL } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction, AttendanceStatus, ScanMethod } from '@prisma/client';
import { invalidateAttendanceCache } from '../cache/invalidate';
import type { ManualMarkInput } from '../schemas';

const log = createLogger('event-execution:attendance-service');

// ============================================================
// Types
// ============================================================

export interface AttendanceRow {
  id: string;
  userId: string;
  status: AttendanceStatus;
  scanMethod: ScanMethod;
  isWalkin: boolean;
  notes: string | null;
  notedAt: Date;
  scannedAt: Date | null;
  user: {
    id: string;
    fullName: string;
    displayName: string | null;
    nrp: string | null;
    email: string;
  };
}

export interface AttendanceStats {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  walkin: number;
  confirmed: number; // RSVP confirmed
}

// ============================================================
// getAttendanceStats
// ============================================================

export async function getAttendanceStats(
  instanceId: string,
  organizationId: string,
): Promise<AttendanceStats> {
  const cacheKey = `event-execution:instance:${instanceId}:attendance:stats`;

  return withCache(cacheKey, CACHE_TTL.SHORT, async () => {
    log.debug('Fetching attendance stats', { instanceId });

    const [attendanceCounts, confirmedCount] = await Promise.all([
      prisma.attendance.groupBy({
        by: ['status'],
        where: { instanceId, organizationId },
        _count: { id: true },
      }),
      prisma.rSVP.count({
        where: { instanceId, organizationId, status: 'CONFIRMED' },
      }),
    ]);

    const walkinCount = await prisma.attendance.count({
      where: { instanceId, organizationId, isWalkin: true },
    });

    const counts: Record<string, number> = {};
    for (const row of attendanceCounts) {
      counts[row.status] = row._count.id;
    }

    return {
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      hadir: counts['HADIR'] ?? 0,
      izin: counts['IZIN'] ?? 0,
      sakit: counts['SAKIT'] ?? 0,
      alpa: counts['ALPA'] ?? 0,
      walkin: walkinCount,
      confirmed: confirmedCount,
    };
  });
}

// ============================================================
// getAttendanceListForInstance
// ============================================================

export async function getAttendanceListForInstance(
  instanceId: string,
  organizationId: string,
): Promise<AttendanceRow[]> {
  const cacheKey = `event-execution:instance:${instanceId}:attendance:list`;

  return withCache(cacheKey, CACHE_TTL.SHORT, async () => {
    log.debug('Fetching attendance list', { instanceId });

    const rows = await prisma.attendance.findMany({
      where: { instanceId, organizationId },
      select: {
        id: true,
        userId: true,
        status: true,
        scanMethod: true,
        isWalkin: true,
        notes: true,
        notedAt: true,
        scannedAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            nrp: true,
            email: true,
          },
        },
      },
      orderBy: [
        { isWalkin: 'asc' },
        { user: { fullName: 'asc' } },
      ],
    });

    return rows;
  });
}

// ============================================================
// bulkMarkHadir
// ============================================================

/**
 * Bulk-mark all CONFIRMED RSVP users as HADIR.
 * Uses upsert to avoid duplicates.
 * Returns count of records affected.
 */
export async function bulkMarkHadir(
  instanceId: string,
  userId: string,
  organizationId: string,
): Promise<{ updated: number; created: number }> {
  log.info('Bulk marking HADIR', { instanceId, userId });

  // Get all confirmed RSVPs
  const confirmedRsvps = await prisma.rSVP.findMany({
    where: { instanceId, organizationId, status: 'CONFIRMED' },
    select: { userId: true },
  });

  if (confirmedRsvps.length === 0) {
    return { updated: 0, created: 0 };
  }

  const userIds = confirmedRsvps.map((r) => r.userId);

  // Existing attendance rows
  const existing = await prisma.attendance.findMany({
    where: { instanceId, userId: { in: userIds } },
    select: { id: true, userId: true },
  });
  const existingUserIds = new Set(existing.map((e) => e.userId));

  // Update existing rows
  let updated = 0;
  if (existing.length > 0) {
    const result = await prisma.attendance.updateMany({
      where: {
        instanceId,
        userId: { in: Array.from(existingUserIds) },
      },
      data: {
        status: AttendanceStatus.HADIR,
        scanMethod: ScanMethod.BULK,
        notedById: userId,
        notedAt: new Date(),
      },
    });
    updated = result.count;
  }

  // Create missing rows
  const missingUserIds = userIds.filter((uid) => !existingUserIds.has(uid));
  let created = 0;

  if (missingUserIds.length > 0) {
    // Need organizationId + cohortId for each — get from instance
    const instance = await prisma.kegiatanInstance.findUnique({
      where: { id: instanceId },
      select: { cohortId: true },
    });

    if (instance) {
      await prisma.attendance.createMany({
        data: missingUserIds.map((uid) => ({
          instanceId,
          userId: uid,
          organizationId,
          status: AttendanceStatus.HADIR,
          scanMethod: ScanMethod.BULK,
          notedById: userId,
        })),
        skipDuplicates: true,
      });
      created = missingUserIds.length;
    }
  }

  // Audit log
  await logAudit({
    action: AuditAction.ATTENDANCE_BULK_MARK,
    organizationId,
    actorUserId: userId,
    entityType: 'KegiatanInstance',
    entityId: instanceId,
    metadata: { updated, created, total: updated + created },
  });

  await invalidateAttendanceCache(instanceId);

  log.info('Bulk HADIR complete', { instanceId, updated, created });

  return { updated, created };
}

// ============================================================
// manualMark
// ============================================================

/**
 * OC manual mark a single attendance row.
 * Creates if not exists (walkin).
 */
export async function manualMark(
  instanceId: string,
  input: ManualMarkInput,
  actorUserId: string,
  organizationId: string,
): Promise<AttendanceRow> {
  const { userId: targetUserId, status, notes } = input;
  log.info('Manual mark attendance', { instanceId, targetUserId, status, actorUserId });

  const newStatus = AttendanceStatus[status as keyof typeof AttendanceStatus];

  // Upsert attendance
  const existing = await prisma.attendance.findFirst({
    where: { instanceId, userId: targetUserId },
    select: { id: true },
  });

  let attendanceId: string;

  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        status: newStatus,
        notes: notes ?? null,
        notedById: actorUserId,
        notedAt: new Date(),
        scanMethod: ScanMethod.MANUAL,
      },
    });
    attendanceId = existing.id;
  } else {
    // Walkin or new entry
    const created = await prisma.attendance.create({
      data: {
        instanceId,
        userId: targetUserId,
        organizationId,
        status: newStatus,
        notes: notes ?? null,
        notedById: actorUserId,
        scanMethod: ScanMethod.MANUAL,
        isWalkin: true,
      },
      select: { id: true },
    });
    attendanceId = created.id;
  }

  // Audit
  await logAudit({
    action: AuditAction.ATTENDANCE_MANUAL_OVERRIDE,
    organizationId,
    actorUserId,
    entityType: 'Attendance',
    entityId: attendanceId,
    afterValue: { status, notes: notes ?? null },
    metadata: { targetUserId },
  });

  await invalidateAttendanceCache(instanceId);

  // Return fresh row
  const fresh = await prisma.attendance.findUniqueOrThrow({
    where: { id: attendanceId },
    select: {
      id: true,
      userId: true,
      status: true,
      scanMethod: true,
      isWalkin: true,
      notes: true,
      notedAt: true,
      scannedAt: true,
      user: {
        select: { id: true, fullName: true, displayName: true, nrp: true, email: true },
      },
    },
  });

  return fresh;
}

// ============================================================
// autoSetAlpaOnDone
// ============================================================

/**
 * Set all attendance rows without HADIR/IZIN/SAKIT to ALPA.
 * Called automatically on DONE lifecycle transition.
 */
export async function autoSetAlpaOnDone(
  instanceId: string,
  actorUserId: string,
  organizationId: string,
): Promise<number> {
  log.info('Auto-setting ALPA on DONE', { instanceId });

  // Get all confirmed RSVPs who don't have HADIR/IZIN/SAKIT
  const confirmedRsvps = await prisma.rSVP.findMany({
    where: { instanceId, organizationId, status: 'CONFIRMED' },
    select: { userId: true },
  });

  const confirmedUserIds = confirmedRsvps.map((r) => r.userId);

  const existingExcused = await prisma.attendance.findMany({
    where: {
      instanceId,
      userId: { in: confirmedUserIds },
      status: { in: [AttendanceStatus.HADIR, AttendanceStatus.IZIN, AttendanceStatus.SAKIT] },
    },
    select: { userId: true },
  });
  const excusedIds = new Set(existingExcused.map((e) => e.userId));

  const alpaUserIds = confirmedUserIds.filter((uid) => !excusedIds.has(uid));

  if (alpaUserIds.length === 0) return 0;

  // Upsert ALPA for missing
  const alpaResult = await prisma.attendance.updateMany({
    where: {
      instanceId,
      userId: { in: alpaUserIds },
    },
    data: {
      status: AttendanceStatus.ALPA,
      scanMethod: ScanMethod.SYSTEM_AUTO,
      notedById: actorUserId,
      notedAt: new Date(),
    },
  });

  // Create rows for users with no attendance record at all
  const existingAll = await prisma.attendance.findMany({
    where: { instanceId, userId: { in: alpaUserIds } },
    select: { userId: true },
  });
  const existingAllIds = new Set(existingAll.map((e) => e.userId));
  const totallyMissing = alpaUserIds.filter((uid) => !existingAllIds.has(uid));

  if (totallyMissing.length > 0) {
    await prisma.attendance.createMany({
      data: totallyMissing.map((uid) => ({
        instanceId,
        userId: uid,
        organizationId,
        status: AttendanceStatus.ALPA,
        scanMethod: ScanMethod.SYSTEM_AUTO,
        notedById: actorUserId,
      })),
      skipDuplicates: true,
    });
  }

  const totalAlpa = alpaResult.count + totallyMissing.length;

  await logAudit({
    action: AuditAction.ATTENDANCE_AUTO_ALPA,
    organizationId,
    actorUserId,
    entityType: 'KegiatanInstance',
    entityId: instanceId,
    metadata: { autoAlpaCount: totalAlpa },
  });

  await invalidateAttendanceCache(instanceId);

  log.info('Auto-ALPA complete', { instanceId, count: totalAlpa });

  return totalAlpa;
}

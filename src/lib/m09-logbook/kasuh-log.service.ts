/**
 * src/lib/m09-logbook/kasuh-log.service.ts
 * NAWASENA M09 — Kasuh biweekly logbook service.
 *
 * Responsibilities:
 *   - getFormState: blank or existing log for a cycle
 *   - submitKasuhLog: insert with discriminated validation
 *   - getHistory: cycle history for a pair
 *   - Audit logging + cache invalidation
 *   - flagUrgent → M15 notif SC (placeholder until M15 template ready)
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { ConflictError, ForbiddenError } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { invalidateKasuhDashboard } from '@/lib/m09-aggregate/kasuh-dashboard-cache';
import { computeCycleNumber, computeCycleDueDate } from '@/lib/m09-logbook/cycle';
import type { KasuhLogInput } from '@/lib/m09-logbook/validation/kasuh-log.schema';
import type { KasuhLog } from '@prisma/client';
import type { NextRequest } from 'next/server';

const log = createLogger('m09:kasuh-log-service');

export interface KasuhFormState {
  existingLog: KasuhLog | null;
  cycleNumber: number;
  cycleDueDate: Date;
  pairId: string;
  mabaUserId: string;
  mabaName: string | null;
}

/**
 * Get form state for a Kasuh log entry.
 */
export async function getFormState(
  kasuhUserId: string,
  pairId: string,
  asOf: Date = new Date(),
): Promise<KasuhFormState> {
  log.debug('Getting Kasuh form state', { kasuhUserId, pairId });

  const pair = await prisma.kasuhPair.findUnique({
    where: { id: pairId },
    include: {
      maba: { select: { id: true, fullName: true, displayName: true } },
    },
  });

  if (!pair) {
    throw ForbiddenError('Pair tidak ditemukan');
  }

  if (pair.kasuhUserId !== kasuhUserId) {
    throw ForbiddenError('Tidak memiliki akses ke pair ini');
  }

  const cycleNumber = computeCycleNumber(pair.createdAt, asOf);
  const cycleDueDate = computeCycleDueDate(pair.createdAt, cycleNumber);

  const existingLog = await prisma.kasuhLog.findUnique({
    where: { pairId_cycleNumber: { pairId, cycleNumber } },
  });

  return {
    existingLog,
    cycleNumber,
    cycleDueDate,
    pairId,
    mabaUserId: pair.mabaUserId,
    mabaName: pair.maba.displayName ?? pair.maba.fullName,
  };
}

/**
 * Submit a Kasuh log entry.
 */
export async function submitKasuhLog(
  kasuhUserId: string,
  orgId: string,
  cohortId: string,
  payload: KasuhLogInput,
  req: NextRequest,
): Promise<KasuhLog> {
  log.info('Submitting Kasuh log', {
    kasuhUserId,
    pairId: payload.pairId,
    cycleNumber: payload.cycleNumber,
    attendance: payload.attendance,
  });

  // Verify pair ownership
  const pair = await prisma.kasuhPair.findUnique({
    where: { id: payload.pairId },
    select: { kasuhUserId: true, mabaUserId: true, createdAt: true },
  });

  if (!pair) {
    throw ForbiddenError('Pair tidak ditemukan');
  }

  if (pair.kasuhUserId !== kasuhUserId) {
    throw ForbiddenError('Tidak memiliki akses ke pair ini');
  }

  // Check for duplicate
  const existing = await prisma.kasuhLog.findUnique({
    where: {
      pairId_cycleNumber: { pairId: payload.pairId, cycleNumber: payload.cycleNumber },
    },
  });

  if (existing) {
    throw ConflictError('Logbook untuk cycle ini sudah disubmit');
  }

  const cycleDueDate = computeCycleDueDate(pair.createdAt, payload.cycleNumber);

  // Build create data based on attendance type
  const isMet = payload.attendance === 'MET';

  const kasuhLog = await prisma.kasuhLog.create({
    data: {
      organizationId: orgId,
      cohortId,
      pairId: payload.pairId,
      kasuhUserId,
      mabaUserId: pair.mabaUserId,
      cycleNumber: payload.cycleNumber,
      cycleDueDate,
      attendance: payload.attendance,
      meetingDate: isMet && 'meetingDate' in payload ? new Date(payload.meetingDate) : null,
      reflection: 'reflection' in payload ? (payload.reflection ?? null) : null,
      attendanceReason: !isMet && 'attendanceReason' in payload ? payload.attendanceReason : null,
      flagUrgent: isMet ? Boolean((payload as Record<string, unknown>).flagUrgent) : false,
      followupNotes: 'followupNotes' in payload ? (payload.followupNotes ?? null) : null,
      submittedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  log.info('Kasuh log saved', { logId: kasuhLog.id, kasuhUserId });

  // Audit log
  await auditLog.record({
    userId: kasuhUserId,
    action: 'KASUH_LOG_SUBMIT',
    resource: 'KasuhLog',
    resourceId: kasuhLog.id,
    newValue: {
      attendance: payload.attendance,
      cycleNumber: payload.cycleNumber,
      flagUrgent: kasuhLog.flagUrgent,
    },
    request: req,
    metadata: { pairId: payload.pairId, cohortId, mabaUserId: pair.mabaUserId },
  });

  // Invalidate Kasuh dashboard cache
  await invalidateKasuhDashboard(kasuhUserId);

  // Handle urgent flag — notify SC
  if (kasuhLog.flagUrgent) {
    log.info('Urgent flag set — M15 SC notification would be sent', {
      logId: kasuhLog.id,
      pairId: payload.pairId,
    });
    // TODO: sendNotification to SC roles when M15 template KASUH_URGENT_FLAG is ready
  }

  return kasuhLog;
}

/**
 * Get cycle history for a pair.
 */
export async function getKasuhLogHistory(pairId: string): Promise<KasuhLog[]> {
  return prisma.kasuhLog.findMany({
    where: { pairId },
    orderBy: { cycleNumber: 'desc' },
  });
}

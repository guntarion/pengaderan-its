/**
 * src/lib/event-execution/services/qr.service.ts
 * NAWASENA M08 — QR Session management for Attendance scanning.
 *
 * Responsibilities:
 * - createQRSession: create a KegiatanQRSession with HMAC-signed QR URL
 * - revokeQRSession: mark session REVOKED + audit
 * - generateQRPng: produce a PNG buffer for display
 * - validateScan: verify HMAC, check expiry/session state, upsert Attendance
 * - expireStale: cron helper to expire ACTIVE sessions past expiresAt
 */

import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '@/utils/prisma';
import { withCache, invalidateCache, CACHE_TTL } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction, KegiatanQRSessionStatus, ScanMethod } from '@prisma/client';
import { invalidateAttendanceCache } from '../cache/invalidate';
import type { CreateQRSessionInput, RevokeQRSessionInput, AttendanceStampInput } from '../schemas';

const log = createLogger('event-execution:qr-service');

/** 6-character random alphanumeric short code */
function generateShortCode(): string {
  return crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
}

/** Get QR signing secret — falls back to PASSPORT_QR_SECRET for compatibility */
function getQRSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET ?? process.env.PASSPORT_QR_SECRET;
  if (!secret) {
    log.error('QR_SIGNING_SECRET not configured');
    throw new Error('QR_SIGNING_SECRET env var not set');
  }
  return secret;
}

/** Build canonical payload string for attendance HMAC */
function buildAttendancePayload(sessionId: string, instanceId: string, expiresAt: string): string {
  return `attendance|${instanceId}|${sessionId}|${expiresAt}`;
}

/** Sign an attendance QR payload */
function signQRPayload(sessionId: string, instanceId: string, expiresAt: string): string {
  const secret = getQRSecret();
  const payload = buildAttendancePayload(sessionId, instanceId, expiresAt);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/** Verify an attendance QR HMAC */
function verifyQRPayload(
  sessionId: string,
  instanceId: string,
  expiresAt: string,
  sig: string,
): boolean {
  try {
    const secret = getQRSecret();
    const payload = buildAttendancePayload(sessionId, instanceId, expiresAt);
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (expected.length !== sig.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}

/** Build the full QR URL embedded in the code */
function buildQRUrl(sessionId: string, instanceId: string, expiresAt: string): string {
  const sig = signQRPayload(sessionId, instanceId, expiresAt);
  const base = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  return `${base}/api/attendance/stamp?sid=${sessionId}&iid=${instanceId}&exp=${encodeURIComponent(expiresAt)}&sig=${sig}`;
}

// ============================================================
// Cache key for active QR session per instance
// ============================================================

const QR_SESSION_CACHE_KEY = (instanceId: string) =>
  `event-execution:instance:${instanceId}:qr-session`;

// ============================================================
// createQRSession
// ============================================================

export interface QRSessionResult {
  id: string;
  instanceId: string;
  shortCode: string;
  expiresAt: Date;
  qrUrl: string;
  status: KegiatanQRSessionStatus;
}

/**
 * Create a new active QR session for an instance.
 * Revokes any previous ACTIVE session first.
 */
export async function createQRSession(
  input: CreateQRSessionInput,
  userId: string,
  organizationId: string,
): Promise<QRSessionResult> {
  const { instanceId, ttlHours = 2 } = input;
  log.info('Creating QR session', { instanceId, ttlHours, userId });

  // Verify instance belongs to this org
  const instance = await prisma.kegiatanInstance.findFirst({
    where: { id: instanceId, organizationId },
    select: { id: true, status: true },
  });
  if (!instance) {
    throw new Error('NOT_FOUND: KegiatanInstance tidak ditemukan.');
  }
  if (!['PLANNED', 'RUNNING'].includes(instance.status)) {
    throw new Error('INVALID_STATE: QR hanya bisa dibuat untuk sesi PLANNED atau RUNNING.');
  }

  // Revoke any active sessions for this instance
  await prisma.kegiatanQRSession.updateMany({
    where: { instanceId, status: KegiatanQRSessionStatus.ACTIVE },
    data: {
      status: KegiatanQRSessionStatus.REVOKED,
      revokedAt: new Date(),
      revokedReason: 'superseded',
    },
  });

  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  const expiresAtIso = expiresAt.toISOString();

  // Generate unique shortCode
  let shortCode = generateShortCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.kegiatanQRSession.findUnique({ where: { shortCode } });
    if (!existing) break;
    shortCode = generateShortCode();
    attempts++;
  }

  const session = await prisma.kegiatanQRSession.create({
    data: {
      instanceId,
      organizationId,
      shortCode,
      createdByUserId: userId,
      expiresAt,
      status: KegiatanQRSessionStatus.ACTIVE,
    },
    select: { id: true, instanceId: true, shortCode: true, expiresAt: true, status: true },
  });

  const qrUrl = buildQRUrl(session.id, instanceId, expiresAtIso);

  await logAudit({
    action: AuditAction.KEGIATAN_QR_SESSION_CREATE,
    organizationId,
    actorUserId: userId,
    entityType: 'KegiatanQRSession',
    entityId: session.id,
    afterValue: { instanceId, ttlHours, expiresAt: expiresAtIso },
  });

  // Invalidate cached active session
  await invalidateCache(QR_SESSION_CACHE_KEY(instanceId));

  log.info('QR session created', { sessionId: session.id, shortCode: session.shortCode });

  return { ...session, qrUrl };
}

// ============================================================
// revokeQRSession
// ============================================================

export async function revokeQRSession(
  input: RevokeQRSessionInput,
  userId: string,
  organizationId: string,
): Promise<void> {
  const { sessionId, reason } = input;
  log.info('Revoking QR session', { sessionId, userId });

  const session = await prisma.kegiatanQRSession.findFirst({
    where: { id: sessionId, organizationId },
    select: { id: true, instanceId: true, status: true },
  });
  if (!session) {
    throw new Error('NOT_FOUND: QR session tidak ditemukan.');
  }
  if (session.status !== KegiatanQRSessionStatus.ACTIVE) {
    throw new Error('INVALID_STATE: Session sudah tidak aktif.');
  }

  await prisma.kegiatanQRSession.update({
    where: { id: sessionId },
    data: {
      status: KegiatanQRSessionStatus.REVOKED,
      revokedAt: new Date(),
      revokedReason: reason ?? 'manual',
    },
  });

  await logAudit({
    action: AuditAction.KEGIATAN_QR_SESSION_REVOKE,
    organizationId,
    actorUserId: userId,
    entityType: 'KegiatanQRSession',
    entityId: sessionId,
    afterValue: { reason },
  });

  await invalidateCache(QR_SESSION_CACHE_KEY(session.instanceId));
  log.info('QR session revoked', { sessionId });
}

// ============================================================
// generateQRPng
// ============================================================

/**
 * Generate a QR PNG buffer for the given session.
 * Returns PNG as Buffer.
 */
export async function generateQRPng(sessionId: string, organizationId: string): Promise<Buffer> {
  const session = await withCache(
    `${QR_SESSION_CACHE_KEY(sessionId)}:png-data`,
    CACHE_TTL.SHORT,
    async () => {
      return prisma.kegiatanQRSession.findFirst({
        where: { id: sessionId, organizationId, status: KegiatanQRSessionStatus.ACTIVE },
        select: { id: true, instanceId: true, expiresAt: true, status: true },
      });
    },
  );

  if (!session) {
    throw new Error('NOT_FOUND: Active QR session tidak ditemukan.');
  }

  if (session.expiresAt < new Date()) {
    throw new Error('EXPIRED: QR session sudah kadaluarsa.');
  }

  const qrUrl = buildQRUrl(session.id, session.instanceId, session.expiresAt.toISOString());

  const pngBuffer = await QRCode.toBuffer(qrUrl, {
    type: 'png',
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0369a1', light: '#ffffff' },
  });

  return pngBuffer;
}

// ============================================================
// validateScan — Maba submits QR stamp
// ============================================================

export type ScanResult =
  | { ok: true; attendanceId: string; isDuplicate: boolean; isWalkin: boolean }
  | { ok: false; reason: 'INVALID_SIG' | 'EXPIRED' | 'SESSION_INACTIVE' | 'INSTANCE_NOT_RUNNING' };

/**
 * Parse QR URL into components.
 * Format: {base}/api/attendance/stamp?sid={sid}&iid={iid}&exp={exp}&sig={sig}
 */
function parseQRUrl(
  qrPayload: string,
): { sessionId: string; instanceId: string; expiresAt: string; sig: string } | null {
  try {
    const url = new URL(qrPayload);
    const sid = url.searchParams.get('sid');
    const iid = url.searchParams.get('iid');
    const exp = url.searchParams.get('exp');
    const sig = url.searchParams.get('sig');
    if (!sid || !iid || !exp || !sig) return null;
    return { sessionId: sid, instanceId: iid, expiresAt: exp, sig };
  } catch {
    return null;
  }
}

/**
 * Validate a QR scan submission and upsert Attendance.
 *
 * Idempotent via clientScanId (unique partial index).
 */
export async function validateScan(
  input: AttendanceStampInput,
  userId: string,
  organizationId: string,
): Promise<ScanResult> {
  const { qrPayload, clientScanId, scanLocation } = input;

  const parsed = parseQRUrl(qrPayload);
  if (!parsed) {
    log.warn('QR payload parse failed', { userId });
    return { ok: false, reason: 'INVALID_SIG' };
  }

  const { sessionId, instanceId, expiresAt, sig } = parsed;
  log.info('Validating QR scan', { sessionId, instanceId, userId });

  // 1. Verify HMAC
  const isValid = verifyQRPayload(sessionId, instanceId, expiresAt, sig);
  if (!isValid) {
    log.warn('QR signature invalid', { sessionId, userId });
    await logAudit({
      action: AuditAction.ATTENDANCE_SCAN_INVALID_SIG,
      organizationId,
      actorUserId: userId,
      entityType: 'KegiatanQRSession',
      entityId: sessionId,
      metadata: { reason: 'INVALID_SIG' },
    });
    return { ok: false, reason: 'INVALID_SIG' };
  }

  // 2. Check expiry
  if (new Date(expiresAt) < new Date()) {
    log.warn('QR session expired', { sessionId, expiresAt });
    await logAudit({
      action: AuditAction.ATTENDANCE_SCAN_LATE,
      organizationId,
      actorUserId: userId,
      entityType: 'KegiatanQRSession',
      entityId: sessionId,
      metadata: { reason: 'EXPIRED', expiresAt },
    });
    return { ok: false, reason: 'EXPIRED' };
  }

  // 3. Check session is ACTIVE
  const session = await prisma.kegiatanQRSession.findFirst({
    where: { id: sessionId, instanceId, organizationId },
    select: { id: true, status: true },
  });
  if (!session || session.status !== KegiatanQRSessionStatus.ACTIVE) {
    log.warn('QR session not active', { sessionId, status: session?.status });
    return { ok: false, reason: 'SESSION_INACTIVE' };
  }

  // 4. Check instance is PLANNED or RUNNING
  const instance = await prisma.kegiatanInstance.findFirst({
    where: { id: instanceId, organizationId },
    select: { id: true, status: true },
  });
  if (!instance || !['PLANNED', 'RUNNING'].includes(instance.status)) {
    return { ok: false, reason: 'INSTANCE_NOT_RUNNING' };
  }

  // 5. Check for idempotent duplicate via clientScanId
  if (clientScanId) {
    const existing = await prisma.attendance.findFirst({
      where: { clientScanId, instanceId },
      select: { id: true },
    });
    if (existing) {
      log.info('Duplicate scan deduplicated', { clientScanId, attendanceId: existing.id });
      await logAudit({
        action: AuditAction.ATTENDANCE_SCAN_DEDUPED,
        organizationId,
        actorUserId: userId,
        entityType: 'Attendance',
        entityId: existing.id,
        metadata: { clientScanId },
      });
      return { ok: true, attendanceId: existing.id, isDuplicate: true, isWalkin: false };
    }
  }

  // 6. Check if user has an RSVP (walkin detection)
  const rsvp = await prisma.rSVP.findFirst({
    where: { instanceId, userId, status: { in: ['CONFIRMED', 'WAITLIST'] } },
    select: { id: true },
  });
  const isWalkin = !rsvp;

  // 7. Upsert Attendance row
  const existingAttendance = await prisma.attendance.findFirst({
    where: { instanceId, userId },
    select: { id: true },
  });

  let attendanceId: string;
  const scannedAt = new Date();

  if (existingAttendance) {
    await prisma.attendance.update({
      where: { id: existingAttendance.id },
      data: {
        status: 'HADIR',
        scanMethod: ScanMethod.QR,
        scannedAt,
        clientScanId: clientScanId ?? null,
        qrSessionId: sessionId,
        isWalkin,
        scanLocation: scanLocation ?? null,
        verifiedAt: new Date(),
      },
    });
    attendanceId = existingAttendance.id;
  } else {
    const created = await prisma.attendance.create({
      data: {
        instanceId,
        userId,
        organizationId,
        status: 'HADIR',
        scanMethod: ScanMethod.QR,
        scannedAt,
        clientScanId: clientScanId ?? null,
        qrSessionId: sessionId,
        isWalkin,
        scanLocation: scanLocation ?? null,
        verifiedAt: new Date(),
      },
      select: { id: true },
    });
    attendanceId = created.id;
  }

  // 8. Increment scan count on session
  await prisma.kegiatanQRSession.update({
    where: { id: sessionId },
    data: { scanCount: { increment: 1 } },
  });

  // 9. Audit log success
  await logAudit({
    action: AuditAction.ATTENDANCE_SCAN_SUCCESS,
    organizationId,
    actorUserId: userId,
    entityType: 'Attendance',
    entityId: attendanceId,
    metadata: { sessionId, isWalkin, scanMethod: 'QR' },
  });

  // 10. Invalidate attendance cache
  await invalidateAttendanceCache(instanceId);

  log.info('QR scan validated', { attendanceId, isWalkin, userId });

  return { ok: true, attendanceId, isDuplicate: false, isWalkin };
}

// ============================================================
// expireStale — called from cron
// ============================================================

/**
 * Expire all ACTIVE QR sessions that are past their expiresAt.
 * Returns count of expired sessions.
 */
export async function expireStaleQRSessions(): Promise<number> {
  log.info('Running QR session expiry sweep');

  const result = await prisma.kegiatanQRSession.updateMany({
    where: {
      status: KegiatanQRSessionStatus.ACTIVE,
      expiresAt: { lt: new Date() },
    },
    data: { status: KegiatanQRSessionStatus.EXPIRED },
  });

  if (result.count > 0) {
    log.info('Expired QR sessions', { count: result.count });
  }

  return result.count;
}

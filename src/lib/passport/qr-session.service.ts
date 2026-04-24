/**
 * src/lib/passport/qr-session.service.ts
 * NAWASENA M05 — QR session management (create, revoke, validate).
 *
 * Handles:
 * - createSession: SC creates QR per event/item
 * - revokeSession: SC revokes active session
 * - validateSession: Maba scan validate
 */

import { prisma } from '@/utils/prisma';
import { PassportQrSessionStatus, EvidenceType, PassportEntryStatus, AuditAction } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import { buildPassportQrUrl, verifyQrPayload } from './qr-hmac';
import { invalidateProgress } from './progress.service';
import { sendNotification } from '@/lib/notifications/send';
import type { NextRequest } from 'next/server';

const log = createLogger('passport:qr-session');

export interface CreateQrSessionInput {
  itemId: string;
  organizationId: string;
  cohortId: string;
  createdByUserId: string;
  eventName: string;
  eventLocation?: string;
  ttlHours?: number; // default 4, max 24
  maxScans?: number;
  request?: NextRequest;
}

export interface CreateQrSessionResult {
  sessionId: string;
  qrPayloadUrl: string;
  expiresAt: Date;
}

export interface ValidateQrSessionInput {
  itemId: string;
  sessionId: string;
  sig: string;
  userId: string;
  organizationId: string;
  cohortId: string;
  request?: NextRequest;
}

export type ValidateQrSessionResult =
  | { valid: true; entryId: string }
  | { valid: false; reason: string };

/**
 * Create a new QR session for an event.
 */
export async function createQrSession(
  input: CreateQrSessionInput,
): Promise<CreateQrSessionResult> {
  const ttlHours = Math.min(input.ttlHours ?? 4, 24);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  const session = await prisma.passportQrSession.create({
    data: {
      organizationId: input.organizationId,
      cohortId: input.cohortId,
      itemId: input.itemId,
      createdByUserId: input.createdByUserId,
      eventName: input.eventName,
      eventLocation: input.eventLocation ?? null,
      status: PassportQrSessionStatus.ACTIVE,
      expiresAt,
      maxScans: input.maxScans ?? null,
    },
  });

  const qrPayloadUrl = buildPassportQrUrl({
    itemId: input.itemId,
    sessionId: session.id,
    expiresAt: expiresAt.toISOString(),
  });

  // Audit log
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: input.organizationId,
        action: AuditAction.PASSPORT_QR_SESSION_CREATE,
        actorUserId: input.createdByUserId,
        entityType: 'PassportQrSession',
        entityId: session.id,
        afterValue: { itemId: input.itemId, eventName: input.eventName, expiresAt },
        ipAddress: input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: input.request?.headers.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    log.warn('Failed to create audit log for QR session', { sessionId: session.id, error: err });
  }

  log.info('QR session created', {
    sessionId: session.id,
    itemId: input.itemId,
    expiresAt,
    createdBy: input.createdByUserId,
  });

  return { sessionId: session.id, qrPayloadUrl, expiresAt };
}

/**
 * Revoke an active QR session.
 */
export async function revokeQrSession(
  sessionId: string,
  revokedByUserId: string,
  reason?: string,
  request?: NextRequest,
): Promise<void> {
  const session = await prisma.passportQrSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error(`QrSession ${sessionId} not found`);

  await prisma.passportQrSession.update({
    where: { id: sessionId },
    data: {
      status: PassportQrSessionStatus.REVOKED,
      revokedAt: new Date(),
      revokedReason: reason ?? null,
    },
  });

  // Audit log
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: session.organizationId,
        action: AuditAction.PASSPORT_QR_SESSION_REVOKE,
        actorUserId: revokedByUserId,
        entityType: 'PassportQrSession',
        entityId: sessionId,
        afterValue: { status: 'REVOKED', reason },
        ipAddress: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: request?.headers.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    log.warn('Failed to create audit log for QR revoke', { sessionId, error: err });
  }

  log.info('QR session revoked', { sessionId, revokedBy: revokedByUserId });
}

/**
 * Validate a scanned QR payload and create VERIFIED PassportEntry if valid.
 */
export async function validateQrSession(
  input: ValidateQrSessionInput,
): Promise<ValidateQrSessionResult> {
  const { itemId, sessionId, sig, userId, organizationId, cohortId, request } = input;

  // 1. Lookup session
  const session = await prisma.passportQrSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    await recordInvalidAttempt({
      userId,
      organizationId,
      itemId,
      sessionId,
      reason: 'session_not_found',
      request,
    });
    return { valid: false, reason: 'QR session tidak ditemukan' };
  }

  // 2. Check status
  if (session.status !== PassportQrSessionStatus.ACTIVE) {
    await recordInvalidAttempt({
      userId,
      organizationId,
      itemId,
      sessionId,
      reason: `session_status_${session.status.toLowerCase()}`,
      request,
    });
    return {
      valid: false,
      reason: session.status === PassportQrSessionStatus.REVOKED
        ? 'QR session telah dicabut oleh admin'
        : 'QR session telah kadaluarsa',
    };
  }

  // 3. Check expiry
  if (session.expiresAt < new Date()) {
    // Mark as expired
    await prisma.passportQrSession.update({
      where: { id: sessionId },
      data: { status: PassportQrSessionStatus.EXPIRED },
    });

    await recordInvalidAttempt({
      userId,
      organizationId,
      itemId,
      sessionId,
      reason: 'session_expired',
      request,
    });
    return { valid: false, reason: 'QR session telah kadaluarsa' };
  }

  // 4. Verify HMAC signature
  const isValidSig = verifyQrPayload({
    itemId,
    sessionId,
    expiresAt: session.expiresAt.toISOString(),
    sig,
  });

  if (!isValidSig) {
    await recordInvalidAttempt({
      userId,
      organizationId,
      itemId,
      sessionId,
      reason: 'signature_mismatch',
      request,
    });
    return { valid: false, reason: 'QR tidak valid (tanda tangan tidak cocok)' };
  }

  // 5. Check item matches
  if (session.itemId !== itemId) {
    await recordInvalidAttempt({
      userId,
      organizationId,
      itemId,
      sessionId,
      reason: 'item_mismatch',
      request,
    });
    return { valid: false, reason: 'QR tidak valid (item tidak cocok)' };
  }

  // 6. Check max scans
  if (session.maxScans !== null && session.scanCount >= session.maxScans) {
    await recordInvalidAttempt({
      userId,
      organizationId,
      itemId,
      sessionId,
      reason: 'max_scans_reached',
      request,
    });
    return { valid: false, reason: 'QR session sudah mencapai batas scan maksimum' };
  }

  // ---- Valid! Create VERIFIED PassportEntry ----
  const entry = await prisma.passportEntry.create({
    data: {
      organizationId,
      cohortId,
      userId,
      itemId,
      evidenceType: EvidenceType.QR_STAMP,
      status: PassportEntryStatus.VERIFIED,
      verifierId: session.createdByUserId,
      verifiedAt: new Date(),
      qrSessionId: sessionId,
    },
  });

  // Increment scan count
  await prisma.passportQrSession.update({
    where: { id: sessionId },
    data: { scanCount: { increment: 1 } },
  });

  // Invalidate progress cache
  await invalidateProgress(userId);

  // Notify Maba
  sendNotification({
    userId,
    templateKey: 'PASSPORT_VERIFIED_TO_MABA',
    category: 'NORMAL',
    payload: { itemId, entryId: entry.id },
  }).catch((err) => {
    log.warn('Failed to send QR verify notification', { userId, error: err });
  });

  log.info('QR scan successful, entry verified', {
    entryId: entry.id,
    userId,
    itemId,
    sessionId,
  });

  return { valid: true, entryId: entry.id };
}

async function recordInvalidAttempt(params: {
  userId: string;
  organizationId: string;
  itemId: string;
  sessionId: string;
  reason: string;
  request?: NextRequest;
}): Promise<void> {
  log.warn('Invalid QR scan attempt', params);
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: params.organizationId,
        action: AuditAction.PASSPORT_QR_INVALID_ATTEMPT,
        actorUserId: params.userId,
        entityType: 'PassportQrSession',
        entityId: params.sessionId,
        metadata: { reason: params.reason, itemId: params.itemId },
        ipAddress:
          params.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: params.request?.headers.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    log.warn('Failed to create audit log for invalid QR attempt', { error: err });
  }
}

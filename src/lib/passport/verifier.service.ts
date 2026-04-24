/**
 * src/lib/passport/verifier.service.ts
 * NAWASENA M05 — Verifier queue, approve, reject, and SC override.
 *
 * Handles:
 * - listQueue: verifier's PENDING entries
 * - approve: verify entry with idempotency
 * - reject: reject with reason (min 10 char)
 * - override: SC force-change status (min 20 char reason)
 */

import { prisma } from '@/utils/prisma';
import { PassportEntryStatus, AuditAction } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import {
  checkVerifyIdempotency,
  recordVerifyIdempotency,
} from './progress-cache';
import { invalidateProgress } from './progress.service';
import { sendNotification } from '@/lib/notifications/send';
import type { NextRequest } from 'next/server';

const log = createLogger('passport:verifier');

export interface QueueFilters {
  dimensi?: string;
  mabaName?: string;
}

export interface QueueItem {
  id: string;
  userId: string;
  itemId: string;
  evidenceType: string;
  status: string;
  submittedAt: Date;
  user: { fullName: string; nrp: string | null };
  item: { description: string; dimensi: string };
  evidenceUploads: Array<{ id: string; s3Key: string; mimeType: string }>;
}

/**
 * List the verifier's queue (PENDING entries assigned to them).
 */
export async function listQueue(
  verifierId: string,
  filters: QueueFilters = {},
): Promise<QueueItem[]> {
  const entries = await prisma.passportEntry.findMany({
    where: {
      verifierId,
      status: PassportEntryStatus.PENDING,
      ...(filters.dimensi ? { item: { dimensi: filters.dimensi as never } } : {}),
    },
    include: {
      user: { select: { fullName: true, nrp: true } },
      item: { select: { description: true, dimensi: true } },
      evidenceUploads: { select: { id: true, s3Key: true, mimeType: true } },
    },
    orderBy: { submittedAt: 'asc' }, // oldest first
  });

  return entries.filter((e) => {
    if (filters.mabaName) {
      return e.user.fullName.toLowerCase().includes(filters.mabaName.toLowerCase());
    }
    return true;
  }) as QueueItem[];
}

export interface ApproveInput {
  entryId: string;
  verifierId: string;
  optionalNote?: string;
  clientIdempotencyKey?: string;
  request?: NextRequest;
}

/**
 * Approve a passport entry.
 */
export async function approve(input: ApproveInput): Promise<void> {
  const { entryId, verifierId, optionalNote, clientIdempotencyKey, request } = input;

  // Check Redis idempotency
  if (clientIdempotencyKey) {
    const alreadyProcessed = await checkVerifyIdempotency(entryId, verifierId);
    if (alreadyProcessed) {
      log.info('Idempotent approve: already processed', { entryId, verifierId });
      return;
    }
  }

  // Validate entry
  const entry = await prisma.passportEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new Error(`PassportEntry ${entryId} not found`);
  if (entry.status !== PassportEntryStatus.PENDING) {
    throw new Error(`Entry status is ${entry.status}, cannot approve`);
  }
  if (entry.verifierId !== verifierId) {
    throw new Error('Not authorized to approve this entry');
  }

  await prisma.passportEntry.update({
    where: { id: entryId },
    data: {
      status: PassportEntryStatus.VERIFIED,
      verifiedAt: new Date(),
      verifierNote: optionalNote ?? null,
    },
  });

  // Record idempotency
  if (clientIdempotencyKey) {
    await recordVerifyIdempotency(entryId, verifierId);
  }

  // Invalidate progress cache for Maba
  await invalidateProgress(entry.userId);

  // Notify Maba
  sendNotification({
    userId: entry.userId,
    templateKey: 'PASSPORT_VERIFIED_TO_MABA',
    category: 'NORMAL',
    payload: { itemId: entry.itemId, entryId, note: optionalNote },
  }).catch((err) => {
    log.warn('Failed to send approve notification to Maba', { userId: entry.userId, error: err });
  });

  // Audit log
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: entry.organizationId,
        action: AuditAction.PASSPORT_VERIFY_APPROVED,
        actorUserId: verifierId,
        subjectUserId: entry.userId,
        entityType: 'PassportEntry',
        entityId: entryId,
        afterValue: { status: 'VERIFIED', note: optionalNote },
        ipAddress: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: request?.headers.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    log.warn('Audit log failed for approve', { entryId, error: err });
  }

  log.info('Passport entry approved', { entryId, verifierId });
}

export interface RejectInput {
  entryId: string;
  verifierId: string;
  reason: string; // min 10 char
  clientIdempotencyKey?: string;
  request?: NextRequest;
}

/**
 * Reject a passport entry.
 */
export async function reject(input: RejectInput): Promise<void> {
  const { entryId, verifierId, reason, clientIdempotencyKey, request } = input;

  if (reason.length < 10) throw new Error('Reason must be at least 10 characters');

  // Check Redis idempotency
  if (clientIdempotencyKey) {
    const alreadyProcessed = await checkVerifyIdempotency(entryId, verifierId);
    if (alreadyProcessed) {
      log.info('Idempotent reject: already processed', { entryId, verifierId });
      return;
    }
  }

  const entry = await prisma.passportEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new Error(`PassportEntry ${entryId} not found`);
  if (entry.status !== PassportEntryStatus.PENDING) {
    throw new Error(`Entry status is ${entry.status}, cannot reject`);
  }
  if (entry.verifierId !== verifierId) {
    throw new Error('Not authorized to reject this entry');
  }

  await prisma.passportEntry.update({
    where: { id: entryId },
    data: {
      status: PassportEntryStatus.REJECTED,
      verifierNote: reason,
    },
  });

  // Record idempotency
  if (clientIdempotencyKey) {
    await recordVerifyIdempotency(entryId, verifierId);
  }

  // Invalidate progress cache
  await invalidateProgress(entry.userId);

  // Notify Maba
  sendNotification({
    userId: entry.userId,
    templateKey: 'PASSPORT_REJECTED_TO_MABA',
    category: 'NORMAL',
    payload: { itemId: entry.itemId, entryId, reason },
  }).catch((err) => {
    log.warn('Failed to send reject notification to Maba', { userId: entry.userId, error: err });
  });

  // Audit log
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: entry.organizationId,
        action: AuditAction.PASSPORT_VERIFY_REJECTED,
        actorUserId: verifierId,
        subjectUserId: entry.userId,
        entityType: 'PassportEntry',
        entityId: entryId,
        afterValue: { status: 'REJECTED', reason },
        ipAddress: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: request?.headers.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    log.warn('Audit log failed for reject', { entryId, error: err });
  }

  log.info('Passport entry rejected', { entryId, verifierId, reason: reason.slice(0, 50) });
}

export interface OverrideInput {
  entryId: string;
  scUserId: string;
  newStatus: 'VERIFIED' | 'REJECTED';
  reason: string; // min 20 char
  clientIdempotencyKey?: string;
  request?: NextRequest;
}

/**
 * SC override an entry's status.
 */
export async function override(input: OverrideInput): Promise<void> {
  const { entryId, scUserId, newStatus, reason, clientIdempotencyKey, request } = input;

  if (reason.length < 20) throw new Error('Override reason must be at least 20 characters');

  const entry = await prisma.passportEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new Error(`PassportEntry ${entryId} not found`);

  await prisma.passportEntry.update({
    where: { id: entryId },
    data: {
      status: newStatus,
      overriddenByUserId: scUserId,
      overriddenReason: reason,
      verifiedAt: newStatus === PassportEntryStatus.VERIFIED ? new Date() : null,
    },
  });

  // Invalidate progress cache
  await invalidateProgress(entry.userId);

  // Notify Maba
  sendNotification({
    userId: entry.userId,
    templateKey:
      newStatus === PassportEntryStatus.VERIFIED
        ? 'PASSPORT_VERIFIED_TO_MABA'
        : 'PASSPORT_REJECTED_TO_MABA',
    category: 'NORMAL',
    payload: { itemId: entry.itemId, entryId, reason, overriddenByAdmin: true },
  }).catch((err) => {
    log.warn('Failed to send override notification', { userId: entry.userId, error: err });
  });

  // Notify original verifier if present
  if (entry.verifierId) {
    sendNotification({
      userId: entry.verifierId,
      templateKey: 'PASSPORT_ENTRY_OVERRIDE_TO_VERIFIER' as never,
      category: 'NORMAL',
      payload: { itemId: entry.itemId, entryId, newStatus, reason },
    }).catch(() => undefined);
  }

  // Audit log
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: entry.organizationId,
        action: AuditAction.PASSPORT_ENTRY_OVERRIDE,
        actorUserId: scUserId,
        subjectUserId: entry.userId,
        entityType: 'PassportEntry',
        entityId: entryId,
        beforeValue: { status: entry.status },
        afterValue: { status: newStatus, reason },
        ipAddress: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: request?.headers.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    log.warn('Audit log failed for override', { entryId, error: err });
  }

  log.info('Passport entry overridden', { entryId, scUserId, newStatus });
}

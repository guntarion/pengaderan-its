/**
 * src/lib/passport/submit.service.ts
 * NAWASENA M05 — Submit passport entry (multi-evidence-type dispatch).
 *
 * Handles:
 * - Idempotency check via clientIdempotencyKey
 * - Verifier resolution from item.verifierRoleHint + M03 KPGroupMember
 * - PassportEntry + PassportEvidenceUpload creation
 * - Progress cache invalidation
 * - M15 notification to verifier
 * - Audit log PASSPORT_SUBMIT
 */

import { prisma } from '@/utils/prisma';
import { EvidenceType, PassportEntryStatus } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import { invalidateProgress } from './progress.service';
import { sendNotification } from '@/lib/notifications/send';
import { AuditAction } from '@prisma/client';
import type { NextRequest } from 'next/server';

const log = createLogger('passport:submit');

export interface SubmitPassportEntryInput {
  userId: string;
  organizationId: string;
  cohortId: string;
  itemId: string;
  evidenceType: EvidenceType;
  s3Key?: string;
  evidenceUrl?: string;
  qrSessionId?: string;
  clientIdempotencyKey?: string;
  previousEntryId?: string;
  verifierId?: string;
  captionNote?: string;
  request?: NextRequest;
}

export interface SubmitPassportEntryResult {
  entryId: string;
  status: PassportEntryStatus;
  isIdempotent: boolean;
}

/**
 * Submit a passport entry.
 * Idempotent: if clientIdempotencyKey already processed, returns existing.
 */
export async function submitPassportEntry(
  input: SubmitPassportEntryInput,
): Promise<SubmitPassportEntryResult> {
  const {
    userId,
    organizationId,
    cohortId,
    itemId,
    evidenceType,
    s3Key,
    evidenceUrl,
    qrSessionId,
    clientIdempotencyKey,
    previousEntryId,
    verifierId: providedVerifierId,
    captionNote,
    request,
  } = input;

  // ---- Idempotency check ----
  if (clientIdempotencyKey) {
    const existing = await prisma.passportEntry.findUnique({
      where: { clientIdempotencyKey },
    });
    if (existing) {
      log.info('Idempotent submit: returning existing entry', {
        entryId: existing.id,
        userId,
        itemId,
      });
      return { entryId: existing.id, status: existing.status, isIdempotent: true };
    }
  }

  // ---- Validate item ----
  const item = await prisma.passportItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error(`PassportItem ${itemId} not found`);

  // ---- Resolve verifier ----
  let resolvedVerifierId: string | null = providedVerifierId ?? null;

  // For non-TANDA_TANGAN and non-QR evidence, auto-resolve from M03
  if (!resolvedVerifierId && evidenceType !== EvidenceType.QR_STAMP) {
    try {
      const verifierHint = item.verifierRoleHint; // e.g. "KP", "KASUH"
      const membership = await prisma.kPGroupMember.findFirst({
        where: {
          user: { organizationId, currentCohortId: cohortId, role: verifierHint as never },
          leftAt: null,
          kpGroup: { cohortId },
        },
        include: { user: true },
      });
      resolvedVerifierId = membership?.userId ?? null;
      if (resolvedVerifierId) {
        log.debug('Verifier resolved from M03', { verifierHint, verifierId: resolvedVerifierId });
      }
    } catch (err) {
      log.warn('Verifier resolution failed, proceeding without verifier', { itemId, error: err });
    }
  }

  // QR_STAMP entries are auto-VERIFIED (no verifier needed in normal flow)
  const entryStatus =
    evidenceType === EvidenceType.QR_STAMP
      ? PassportEntryStatus.VERIFIED
      : PassportEntryStatus.PENDING;

  const verifiedAt = evidenceType === EvidenceType.QR_STAMP ? new Date() : null;

  // ---- Create PassportEntry ----
  const entry = await prisma.passportEntry.create({
    data: {
      organizationId,
      cohortId,
      userId,
      itemId,
      evidenceType,
      evidenceUrl: evidenceUrl ?? null,
      status: entryStatus,
      clientIdempotencyKey: clientIdempotencyKey ?? null,
      previousEntryId: previousEntryId ?? null,
      verifierId: resolvedVerifierId,
      verifiedAt,
      qrSessionId: qrSessionId ?? null,
      metadataJson: captionNote ? { captionNote } : undefined,
    },
  });

  log.info('PassportEntry created', {
    entryId: entry.id,
    userId,
    itemId,
    evidenceType,
    status: entryStatus,
    verifierId: resolvedVerifierId,
  });

  // ---- Create evidence upload record if s3Key provided ----
  if (s3Key) {
    await prisma.passportEvidenceUpload.create({
      data: {
        organizationId,
        entryId: entry.id,
        s3Key,
        s3Bucket: process.env.SPACES_BUCKET ?? '',
        originalFilename: s3Key.split('/').pop() ?? s3Key,
        mimeType: 'image/jpeg', // Will be validated async
        sizeBytes: 0, // Will be updated after upload confirms
        scanStatus: 'PENDING',
      },
    });
    log.debug('EvidenceUpload record created', { entryId: entry.id, s3Key });
  }

  // ---- Invalidate progress cache ----
  await invalidateProgress(userId);

  // ---- Send notification to verifier (non-QR entries) ----
  if (resolvedVerifierId && entryStatus === PassportEntryStatus.PENDING) {
    sendNotification({
      userId: resolvedVerifierId,
      templateKey: 'PASSPORT_SUBMIT_TO_VERIFIER',
      category: 'NORMAL',
      payload: {
        mabaName: userId,
        itemName: item.description,
        entryId: entry.id,
      },
    }).catch((err) => {
      log.warn('Failed to send submit notification to verifier', {
        verifierId: resolvedVerifierId,
        error: err,
      });
    });
  }

  // ---- Audit log ----
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId,
        action: AuditAction.PASSPORT_SUBMIT,
        actorUserId: userId,
        entityType: 'PassportEntry',
        entityId: entry.id,
        afterValue: {
          itemId,
          evidenceType,
          status: entryStatus,
          verifierId: resolvedVerifierId,
        },
        ipAddress: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: request?.headers.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    log.warn('Audit log creation failed', { entryId: entry.id, error: err });
  }

  return { entryId: entry.id, status: entryStatus, isIdempotent: false };
}

/**
 * Cancel a pending passport entry (Maba self-cancel).
 */
export async function cancelPassportEntry(
  entryId: string,
  userId: string,
  reason?: string,
  request?: NextRequest,
): Promise<void> {
  const entry = await prisma.passportEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new Error(`PassportEntry ${entryId} not found`);
  if (entry.userId !== userId) throw new Error('Not authorized to cancel this entry');
  if (entry.status !== PassportEntryStatus.PENDING) {
    throw new Error(`Cannot cancel entry with status ${entry.status}`);
  }

  await prisma.passportEntry.update({
    where: { id: entryId },
    data: {
      status: PassportEntryStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledReason: reason ?? null,
    },
  });

  await invalidateProgress(userId);

  // Audit log
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: entry.organizationId,
        action: AuditAction.PASSPORT_ENTRY_CANCELLED,
        actorUserId: userId,
        entityType: 'PassportEntry',
        entityId: entryId,
        afterValue: { status: PassportEntryStatus.CANCELLED, reason },
        ipAddress: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: request?.headers.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    log.warn('Audit log creation failed for cancel', { entryId, error: err });
  }

  log.info('PassportEntry cancelled', { entryId, userId });
}

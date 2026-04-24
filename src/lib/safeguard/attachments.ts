/**
 * src/lib/safeguard/attachments.ts
 * NAWASENA M10 — Safeguard incident attachment management.
 *
 * Handles presigned upload/download URLs for incident attachments.
 * MIME whitelist: JPEG, PNG, WEBP, PDF
 * Max file size: 5MB
 * Max attachments per incident: 3
 * Upload URL TTL: 600s (10 min)
 * Download URL TTL: 600s (10 min)
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { issuePutUrl } from '@/lib/storage/presigned-upload';
import { issueGetUrl } from '@/lib/storage/presigned-download';
import { TimelineAction, AuditAction } from '@prisma/client';
import type { IncidentActor } from './types';

const log = createLogger('safeguard:attachments');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_ATTACHMENTS = 3;
const UPLOAD_TTL_SECONDS = 600;
const DOWNLOAD_TTL_SECONDS = 600;

export interface PresignUploadResult {
  uploadUrl: string;
  s3Key: string;
  expiresAt: Date;
  attachmentRecordId: string;
}

export interface PresignDownloadResult {
  downloadUrl: string;
  fileName: string;
  mimeType: string;
  expiresAt: Date;
}

/**
 * Generate a presigned PUT URL for uploading an incident attachment.
 *
 * Validates:
 * - MIME type is in the allowed whitelist
 * - File size does not exceed 5MB
 * - Incident does not already have 3 attachments
 *
 * Creates a pending attachment record in the incident (appended to attachmentKeys as 'PENDING:{key}').
 *
 * @throws Error with code 'MIME_NOT_ALLOWED' if MIME type is rejected
 * @throws Error with code 'FILE_TOO_LARGE' if size exceeds 5MB
 * @throws Error with code 'MAX_ATTACHMENTS' if incident already has 3 attachments
 */
export async function presignUpload(
  incidentId: string,
  userId: string,
  orgId: string,
  opts: { fileName: string; mimeType: string; sizeBytes: number },
): Promise<PresignUploadResult> {
  log.info('Presigning upload', { incidentId, userId, mimeType: opts.mimeType });

  // ---- MIME validation ----
  if (!ALLOWED_MIME_TYPES.includes(opts.mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    const err = new Error(
      `Tipe file tidak diizinkan: ${opts.mimeType}. Hanya JPEG, PNG, WEBP, dan PDF.`,
    );
    (err as NodeJS.ErrnoException).code = 'MIME_NOT_ALLOWED';
    throw err;
  }

  // ---- Size validation ----
  if (opts.sizeBytes > MAX_SIZE_BYTES) {
    const err = new Error(`Ukuran file melebihi batas 5MB (${opts.sizeBytes} bytes).`);
    (err as NodeJS.ErrnoException).code = 'FILE_TOO_LARGE';
    throw err;
  }

  // ---- Fetch incident + check attachment count ----
  const incident = await prisma.safeguardIncident.findUnique({
    where: { id: incidentId },
    select: { id: true, attachmentKeys: true, organizationId: true },
  });

  if (!incident) {
    const err = new Error(`Incident not found: ${incidentId}`);
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }

  if (incident.organizationId !== orgId) {
    const err = new Error('Cross-org access denied');
    (err as NodeJS.ErrnoException).code = 'FORBIDDEN';
    throw err;
  }

  // Count confirmed attachments only
  const confirmedAttachments = incident.attachmentKeys.filter(
    (k) => !k.startsWith('PENDING:'),
  );

  if (confirmedAttachments.length >= MAX_ATTACHMENTS) {
    const err = new Error(`Batas maksimal ${MAX_ATTACHMENTS} lampiran telah tercapai.`);
    (err as NodeJS.ErrnoException).code = 'MAX_ATTACHMENTS';
    throw err;
  }

  // ---- Generate S3 key ----
  const ext = opts.fileName.split('.').pop()?.toLowerCase() ?? 'bin';
  const s3Key = `safeguard/incidents/${incidentId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // ---- Issue presigned PUT URL ----
  const { uploadUrl, expiresAt } = await issuePutUrl({
    key: s3Key,
    contentType: opts.mimeType,
    contentLength: opts.sizeBytes,
    ttlSeconds: UPLOAD_TTL_SECONDS,
  });

  // ---- Reserve key as PENDING in incident ----
  await prisma.safeguardIncident.update({
    where: { id: incidentId },
    data: {
      attachmentKeys: [...incident.attachmentKeys, `PENDING:${s3Key}`],
    },
  });

  log.info('Upload presigned', { incidentId, s3Key, expiresAt });

  return {
    uploadUrl,
    s3Key,
    expiresAt,
    attachmentRecordId: s3Key, // use s3Key as the record identifier until confirmed
  };
}

/**
 * Confirm an attachment upload was successful.
 *
 * Moves the key from PENDING status to confirmed.
 * Creates a timeline entry ATTACHMENT_ADDED.
 *
 * @throws Error with code 'NOT_FOUND' if pending key not found in incident
 */
export async function confirmUpload(
  incidentId: string,
  s3Key: string,
  actor: IncidentActor,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  log.info('Confirming upload', { incidentId, s3Key });

  const incident = await prisma.safeguardIncident.findUnique({
    where: { id: incidentId },
    select: { id: true, attachmentKeys: true, organizationId: true },
  });

  if (!incident) {
    const err = new Error(`Incident not found: ${incidentId}`);
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }

  const pendingKey = `PENDING:${s3Key}`;
  if (!incident.attachmentKeys.includes(pendingKey)) {
    const err = new Error(`Pending attachment not found: ${s3Key}`);
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }

  // Replace PENDING:key with confirmed key
  const updatedKeys = incident.attachmentKeys.map((k) =>
    k === pendingKey ? s3Key : k,
  );

  await prisma.$transaction(async (tx) => {
    await tx.safeguardIncident.update({
      where: { id: incidentId },
      data: { attachmentKeys: updatedKeys },
    });

    await tx.incidentTimelineEntry.create({
      data: {
        organizationId: incident.organizationId,
        incidentId,
        actorId: actor.id,
        action: TimelineAction.ATTACHMENT_ADDED,
        newValue: { s3Key },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });
  });

  log.info('Upload confirmed', { incidentId, s3Key });
}

/**
 * Generate a presigned GET URL for downloading an incident attachment.
 *
 * Access control:
 * - SC and Safeguard Officers: always allowed
 * - KP (reporter): allowed if they reported the incident
 * - PEMBINA: denied (no download, only metadata)
 * - MABA: denied
 *
 * Creates an ATTACHMENT_DOWNLOADED audit/timeline entry.
 *
 * @throws Error with code 'FORBIDDEN' if viewer lacks access
 * @throws Error with code 'NOT_FOUND' if attachment key not found
 */
export async function presignDownload(
  incidentId: string,
  s3Key: string,
  viewer: IncidentActor,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<PresignDownloadResult> {
  log.info('Presigning download', { incidentId, s3Key, viewerId: viewer.id });

  const incident = await prisma.safeguardIncident.findUnique({
    where: { id: incidentId },
    select: {
      id: true,
      attachmentKeys: true,
      organizationId: true,
      reportedById: true,
    },
  });

  if (!incident) {
    const err = new Error(`Incident not found: ${incidentId}`);
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }

  // ---- Access control ----
  const isScOrOfficer = viewer.role === 'SC' || viewer.isSafeguardOfficer;
  const isReporter = incident.reportedById === viewer.id;
  const isPembina = viewer.role === 'PEMBINA';

  if (isPembina) {
    const err = new Error('Pembina tidak memiliki akses untuk mengunduh lampiran.');
    (err as NodeJS.ErrnoException).code = 'FORBIDDEN';
    throw err;
  }

  if (!isScOrOfficer && !isReporter) {
    const err = new Error('Akses tidak diizinkan untuk mengunduh lampiran ini.');
    (err as NodeJS.ErrnoException).code = 'FORBIDDEN';
    throw err;
  }

  // ---- Validate key exists in incident ----
  if (!incident.attachmentKeys.includes(s3Key)) {
    const err = new Error(`Attachment not found: ${s3Key}`);
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }

  // ---- Generate signed URL ----
  const fileName = s3Key.split('/').pop() ?? 'attachment';
  const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

  const downloadUrl = await issueGetUrl({
    key: s3Key,
    ttlSeconds: DOWNLOAD_TTL_SECONDS,
    filename: fileName,
  });

  const expiresAt = new Date(Date.now() + DOWNLOAD_TTL_SECONDS * 1000);

  // ---- Audit + timeline entry ----
  await prisma.incidentTimelineEntry.create({
    data: {
      organizationId: incident.organizationId,
      incidentId,
      actorId: viewer.id,
      action: TimelineAction.ATTACHMENT_DOWNLOADED,
      newValue: { s3Key, downloadedBy: viewer.id },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
  });

  // Audit log
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        action: AuditAction.ATTACHMENT_DOWNLOAD,
        actorUserId: viewer.id,
        organizationId: incident.organizationId,
        entityType: 'SafeguardIncident',
        entityId: incidentId,
        metadata: { s3Key, ipAddress: meta?.ipAddress },
      },
    });
  } catch (err) {
    log.error('Failed to write attachment download audit log', { error: err });
  }

  log.info('Download presigned', { incidentId, s3Key, viewerId: viewer.id });

  return { downloadUrl, fileName, mimeType, expiresAt };
}

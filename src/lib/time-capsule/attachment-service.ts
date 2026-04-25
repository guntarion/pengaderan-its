/**
 * src/lib/time-capsule/attachment-service.ts
 * NAWASENA M07 — Time Capsule attachment service.
 *
 * Reuses M05 S3/Spaces helpers (issuePutUrl, issueGetUrl).
 * Validates: mime allowlist, size ≤ 10MB, max 3 attachments per entry.
 */

import { prisma } from '@/utils/prisma';
import { BadRequestError, NotFoundError } from '@/lib/api';
import { issuePutUrl } from '@/lib/storage/presigned-upload';
import { issueGetUrl } from '@/lib/storage/presigned-download';
import { getS3Client, getSpacesBucket } from '@/lib/storage/s3-client';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { createLogger } from '@/lib/logger';
import { assertCanReadEntry } from './share-resolver';

const log = createLogger('time-capsule:attachment');

// ── Constants ──────────────────────────────────────────────────────────────

const MIME_ALLOWLIST = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_ATTACHMENTS_PER_ENTRY = 3;

interface CurrentUser {
  id: string;
  role: string;
}

// ── Helper: sanitize filename ─────────────────────────────────────────────

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 100);
}

function generateShortUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().split('-')[0];
  }
  return Math.random().toString(36).slice(2, 10);
}

// ── Issue Upload URL ──────────────────────────────────────────────────────

export interface IssueUploadUrlParams {
  userId: string;
  cohortId: string;
  orgId: string;
  entryId?: string; // null = draft upload
  filename: string;
  mime: string;
  size: number;
}

export interface IssueUploadUrlResult {
  uploadUrl: string;
  storageKey: string;
  expiresAt: Date;
}

/**
 * Validate and issue a presigned PUT URL for a Time Capsule attachment.
 */
export async function issueUploadUrl({
  userId,
  orgId,
  entryId,
  filename,
  mime,
  size,
}: Omit<IssueUploadUrlParams, 'cohortId'>): Promise<IssueUploadUrlResult> {
  // Validate mime type
  if (!MIME_ALLOWLIST.includes(mime)) {
    const err = BadRequestError(`Tipe file tidak diizinkan. Gunakan: ${MIME_ALLOWLIST.join(', ')}`);
    (err as Error & { code: string }).code = 'MIME_NOT_ALLOWED';
    throw err;
  }

  // Validate size
  if (size > MAX_SIZE_BYTES) {
    const err = BadRequestError(`File terlalu besar. Maks ${MAX_SIZE_BYTES / 1024 / 1024}MB`);
    (err as Error & { code: string }).code = 'ATTACHMENT_TOO_LARGE';
    throw err;
  }

  // Validate attachment count if entryId provided
  if (entryId) {
    const count = await prisma.timeCapsuleAttachment.count({
      where: { entryId },
    });
    if (count >= MAX_ATTACHMENTS_PER_ENTRY) {
      const err = BadRequestError(`Maks ${MAX_ATTACHMENTS_PER_ENTRY} lampiran per catatan`);
      (err as Error & { code: string }).code = 'ATTACHMENT_LIMIT_EXCEEDED';
      throw err;
    }
  }

  // Build storage key
  const safeFilename = sanitizeFilename(filename);
  const uuid = generateShortUUID();
  const segment = entryId ?? 'draft';
  const storageKey = `time-capsule/${orgId}/${userId}/${segment}/${uuid}-${safeFilename}`;

  // Issue presigned PUT URL (TTL 15 minutes)
  const result = await issuePutUrl({
    key: storageKey,
    contentType: mime,
    contentLength: size,
    ttlSeconds: 900,
  });

  log.info('Attachment upload URL issued', { userId, entryId, storageKey, mime, size });

  // Note: uploadUrl is intentionally NOT logged
  return { uploadUrl: result.uploadUrl, storageKey, expiresAt: result.expiresAt };
}

// ── Confirm Upload ────────────────────────────────────────────────────────

export interface ConfirmUploadParams {
  userId: string;
  orgId: string;
  cohortId: string;
  entryId?: string;
  storageKey: string;
  mime: string;
  size: number;
  originalFilename: string;
}

/**
 * Confirm upload: verify S3 HEAD, create TimeCapsuleAttachment row.
 */
export async function confirmUpload({
  userId,
  orgId,
  cohortId,
  entryId,
  storageKey,
  mime,
  size,
  originalFilename,
}: ConfirmUploadParams) {
  // Verify S3 object exists
  const client = getS3Client();
  const bucket = getSpacesBucket();

  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: storageKey }));
  } catch {
    throw BadRequestError('File belum ditemukan di storage. Coba lagi setelah upload selesai.');
  }

  const attachment = await prisma.timeCapsuleAttachment.create({
    data: {
      organizationId: orgId,
      cohortId,
      userId,
      entryId: entryId ?? null,
      storageKey,
      originalFilename,
      mimeType: mime,
      size,
    },
  });

  log.info('Attachment confirmed and created', { attachmentId: attachment.id, userId, entryId });

  return attachment;
}

// ── Issue Download URL ────────────────────────────────────────────────────

/**
 * Issue a presigned GET URL for downloading an attachment.
 * Performs double gate: owner or active Kasuh with shared entry.
 */
export async function issueDownloadUrl(
  attachmentId: string,
  currentUser: CurrentUser,
): Promise<string> {
  const attachment = await prisma.timeCapsuleAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      entry: {
        select: { id: true, userId: true, cohortId: true, sharedWithKasuh: true },
      },
    },
  });

  if (!attachment) throw NotFoundError('Lampiran tidak ditemukan');

  // Double gate: owner or Kasuh
  if (attachment.userId !== currentUser.id) {
    if (!attachment.entry) {
      throw NotFoundError('Lampiran tidak dapat diakses');
    }
    await assertCanReadEntry(
      {
        id: attachment.entry.id,
        userId: attachment.entry.userId,
        cohortId: attachment.entry.cohortId,
        sharedWithKasuh: attachment.entry.sharedWithKasuh,
      },
      currentUser,
    );
  }

  // Issue presigned GET URL (TTL 1 hour)
  const url = await issueGetUrl({
    key: attachment.storageKey,
    ttlSeconds: 3600,
    filename: attachment.originalFilename,
  });

  log.debug('Attachment download URL issued', { attachmentId, userId: currentUser.id });
  // Note: url is intentionally NOT logged

  return url;
}

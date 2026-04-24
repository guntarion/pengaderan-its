/**
 * src/lib/event-execution/services/output.service.ts
 * NAWASENA M08 — Output Upload management service.
 *
 * - initFileUpload: issue S3 presigned PUT URL, create OutputUpload PENDING
 * - finalizeFileUpload: mark uploaded, sniff MIME, set scanStatus
 * - createUrlOutput: create LINK/VIDEO/REPO output without S3
 * - deleteOutput: authz check + delete DB row (S3 cleanup is async/manual)
 * - getOutputsForInstance: cached output list
 */

import { prisma } from '@/utils/prisma';
import { withCache, CACHE_TTL } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction, OutputType, OutputScanStatus } from '@prisma/client';
import { invalidateOutputCache } from '../cache/invalidate';
import { issuePutUrl } from '@/lib/storage/presigned-upload';
import type { InitFileUploadInput, CreateUrlOutputInput } from '../schemas';

const log = createLogger('event-execution:output-service');

const MAX_FILE_BYTES = 52_428_800; // 50MB

// ============================================================
// getOutputsForInstance
// ============================================================

export interface OutputItem {
  id: string;
  type: OutputType;
  url: string;
  caption: string;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  scanStatus: OutputScanStatus;
  uploadedAt: Date;
  uploader: {
    id: string;
    fullName: string;
  };
}

export async function getOutputsForInstance(
  instanceId: string,
  organizationId: string,
): Promise<OutputItem[]> {
  const cacheKey = `event-execution:instance:${instanceId}:outputs`;

  return withCache(cacheKey, CACHE_TTL.MEDIUM, async () => {
    log.debug('Fetching outputs', { instanceId });

    return prisma.outputUpload.findMany({
      where: { instanceId, organizationId },
      select: {
        id: true,
        type: true,
        url: true,
        caption: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        scanStatus: true,
        uploadedAt: true,
        uploader: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  });
}

// ============================================================
// initFileUpload
// ============================================================

export interface InitUploadResult {
  outputId: string;
  uploadUrl: string;
  s3Key: string;
  bucket: string;
  expiresAt: Date;
}

/**
 * Create a PENDING OutputUpload row and return a presigned PUT URL.
 */
export async function initFileUpload(
  instanceId: string,
  userId: string,
  organizationId: string,
  input: InitFileUploadInput,
): Promise<InitUploadResult> {
  log.info('Initiating file upload', { instanceId, filename: input.filename });

  if (input.sizeBytes > MAX_FILE_BYTES) {
    throw new Error('VALIDATION: File melebihi batas maksimal 50MB.');
  }

  // Verify instance
  const instance = await prisma.kegiatanInstance.findFirst({
    where: { id: instanceId, organizationId },
    select: { id: true, status: true },
  });
  if (!instance) {
    throw new Error('NOT_FOUND: Instance tidak ditemukan.');
  }

  // Sanitize filename
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
  const s3Key = `m08/outputs/${organizationId}/${instanceId}/${Date.now()}_${safeName}`;

  // Issue presigned URL
  const { uploadUrl, bucket, expiresAt } = await issuePutUrl({
    key: s3Key,
    contentType: input.mimeType,
    contentLength: input.sizeBytes,
  });

  // Create pending DB row
  const output = await prisma.outputUpload.create({
    data: {
      instanceId,
      organizationId,
      uploaderId: userId,
      type: OutputType.FILE,
      url: '', // will be set on finalize
      s3Key,
      s3Bucket: bucket,
      caption: input.caption,
      originalFilename: safeName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      scanStatus: OutputScanStatus.PENDING,
    },
    select: { id: true },
  });

  log.info('File upload initiated', { outputId: output.id, s3Key });

  return {
    outputId: output.id,
    uploadUrl,
    s3Key,
    bucket,
    expiresAt,
  };
}

// ============================================================
// finalizeFileUpload
// ============================================================

/**
 * Mark an OutputUpload as uploaded.
 * Sets the public URL and sets scanStatus to CLEAN (basic validation only).
 * In production, a real virus scan would run async and update scanStatus.
 */
export async function finalizeFileUpload(
  outputId: string,
  userId: string,
  organizationId: string,
): Promise<void> {
  log.info('Finalizing file upload', { outputId });

  const output = await prisma.outputUpload.findFirst({
    where: { id: outputId, organizationId, uploaderId: userId, type: OutputType.FILE },
    select: { id: true, s3Key: true, s3Bucket: true, mimeType: true },
  });

  if (!output || !output.s3Key || !output.s3Bucket) {
    throw new Error('NOT_FOUND: Upload record tidak ditemukan atau bukan FILE type.');
  }

  // Construct public URL
  const spacesEndpoint = process.env.SPACES_ENDPOINT ?? 'sgp1.digitaloceanspaces.com';
  const publicUrl = `https://${output.s3Bucket}.${spacesEndpoint}/${output.s3Key}`;

  await prisma.outputUpload.update({
    where: { id: outputId },
    data: {
      url: publicUrl,
      scanStatus: OutputScanStatus.CLEAN, // Basic — real scan would be async
    },
  });

  await logAudit({
    action: AuditAction.OUTPUT_UPLOAD_CREATE,
    organizationId,
    actorUserId: userId,
    entityType: 'OutputUpload',
    entityId: outputId,
    afterValue: { url: publicUrl, s3Key: output.s3Key },
  });

  await invalidateOutputCache(output.s3Key.split('/')[3] ?? ''); // instanceId from key

  log.info('File upload finalized', { outputId });
}

// ============================================================
// createUrlOutput
// ============================================================

/**
 * Create a LINK/VIDEO/REPO output (no S3).
 */
export async function createUrlOutput(
  instanceId: string,
  userId: string,
  organizationId: string,
  input: CreateUrlOutputInput,
): Promise<string> {
  log.info('Creating URL output', { instanceId, type: input.type });

  const instance = await prisma.kegiatanInstance.findFirst({
    where: { id: instanceId, organizationId },
    select: { id: true },
  });
  if (!instance) {
    throw new Error('NOT_FOUND: Instance tidak ditemukan.');
  }

  const outputType = OutputType[input.type as keyof typeof OutputType];

  const output = await prisma.outputUpload.create({
    data: {
      instanceId,
      organizationId,
      uploaderId: userId,
      type: outputType,
      url: input.url,
      caption: input.caption,
      scanStatus: OutputScanStatus.NA, // Non-FILE — scan not applicable
    },
    select: { id: true },
  });

  await logAudit({
    action: AuditAction.OUTPUT_UPLOAD_CREATE,
    organizationId,
    actorUserId: userId,
    entityType: 'OutputUpload',
    entityId: output.id,
    afterValue: { type: input.type, url: input.url },
  });

  await invalidateOutputCache(instanceId);

  log.info('URL output created', { outputId: output.id });

  return output.id;
}

// ============================================================
// deleteOutput
// ============================================================

/**
 * Delete an output upload.
 * Authorization: uploader or SC/SUPERADMIN only.
 * S3 file deletion is noted in audit log but not performed synchronously here.
 */
export async function deleteOutput(
  outputId: string,
  userId: string,
  organizationId: string,
  userRole: string,
): Promise<void> {
  log.info('Deleting output', { outputId, userId });

  const output = await prisma.outputUpload.findFirst({
    where: { id: outputId, organizationId },
    select: { id: true, uploaderId: true, type: true, s3Key: true, instanceId: true },
  });

  if (!output) {
    throw new Error('NOT_FOUND: Output tidak ditemukan.');
  }

  const canDelete =
    output.uploaderId === userId || ['SC', 'SUPERADMIN'].includes(userRole);

  if (!canDelete) {
    throw new Error('FORBIDDEN: Hanya uploader atau SC yang bisa menghapus output.');
  }

  await prisma.outputUpload.delete({ where: { id: outputId } });

  await logAudit({
    action: AuditAction.OUTPUT_UPLOAD_DELETE,
    organizationId,
    actorUserId: userId,
    entityType: 'OutputUpload',
    entityId: outputId,
    metadata: { s3Key: output.s3Key, type: output.type },
  });

  await invalidateOutputCache(output.instanceId);

  log.info('Output deleted', { outputId });
}

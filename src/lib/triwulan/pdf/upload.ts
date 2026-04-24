/**
 * src/lib/triwulan/pdf/upload.ts
 * NAWASENA M14 — Upload rendered PDF buffer to S3/Spaces.
 *
 * Returns the S3 key for the stored PDF.
 * Key format: triwulan/{reviewId}/review-triwulan-{reviewId}.pdf
 */

import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '@/lib/storage/s3-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('m14/pdf/upload');

const BUCKET = process.env.SPACES_BUCKET ?? 'nawasena-its-prod';
const PRESIGNED_EXPIRY_SECS = 3600; // 1 hour

export function getStorageKey(reviewId: string): string {
  return `triwulan/${reviewId}/review-triwulan-${reviewId}.pdf`;
}

/**
 * Upload a PDF buffer to S3 and return the storage key.
 */
export async function uploadPDF(reviewId: string, buffer: Buffer): Promise<string> {
  const key = getStorageKey(reviewId);
  const s3 = getS3Client();

  log.info('Uploading PDF to S3', { reviewId, key, bytes: buffer.length });

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      ContentDisposition: `attachment; filename="review-triwulan-${reviewId}.pdf"`,
    })
  );

  log.info('PDF uploaded successfully', { reviewId, key });
  return key;
}

/**
 * Generate a presigned download URL for a stored PDF.
 */
export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const s3 = getS3Client();
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: PRESIGNED_EXPIRY_SECS });
  log.debug('Presigned URL generated', { key, expiresIn: PRESIGNED_EXPIRY_SECS });
  return url;
}

/**
 * Delete a PDF from S3 (used by retention purge cron).
 */
export async function deletePDF(key: string): Promise<void> {
  const s3 = getS3Client();
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  log.info('PDF deleted from S3', { key });
}

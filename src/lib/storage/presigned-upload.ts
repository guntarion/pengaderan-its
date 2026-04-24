/**
 * src/lib/storage/presigned-upload.ts
 * NAWASENA M05 — Issue presigned PUT URL for direct client upload to Spaces.
 *
 * Client uploads directly to Spaces (no server proxy).
 * TTL default 15 minutes (900s).
 */

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, getSpacesBucket } from './s3-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('storage:presigned-upload');

export interface PutUrlOptions {
  key: string;
  contentType: string;
  contentLength: number;
  ttlSeconds?: number;
}

export interface PutUrlResult {
  uploadUrl: string;
  s3Key: string;
  bucket: string;
  expiresAt: Date;
}

/**
 * Issue a presigned PUT URL for direct client upload.
 *
 * @param options.key          - S3 object key (from buildKey())
 * @param options.contentType  - MIME type claimed by client
 * @param options.contentLength - File size in bytes
 * @param options.ttlSeconds   - URL TTL (default 900s = 15 min)
 * @returns presigned URL + metadata
 */
export async function issuePutUrl({
  key,
  contentType,
  contentLength,
  ttlSeconds = 900,
}: PutUrlOptions): Promise<PutUrlResult> {
  const client = getS3Client();
  const bucket = getSpacesBucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
    // Private by default — no public ACL
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: ttlSeconds });
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  log.debug('Presigned PUT URL issued', { key, contentType, contentLength, ttlSeconds });

  return { uploadUrl, s3Key: key, bucket, expiresAt };
}

/**
 * src/lib/storage/presigned-download.ts
 * NAWASENA M05 — Issue presigned GET URL for accessing private S3 objects.
 *
 * Used by evidence viewer (Maba & verifier) and SC photo access (with audit log).
 * TTL default 15 minutes (900s).
 */

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, getSpacesBucket } from './s3-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('storage:presigned-download');

export interface GetUrlOptions {
  key: string;
  ttlSeconds?: number;
  filename?: string; // optional: force download with specific filename
}

/**
 * Issue a presigned GET URL for a private S3 object.
 *
 * @param options.key        - S3 object key
 * @param options.ttlSeconds - URL TTL (default 900s = 15 min)
 * @param options.filename   - Optional: override Content-Disposition filename
 * @returns signed URL string
 */
export async function issueGetUrl({
  key,
  ttlSeconds = 900,
  filename,
}: GetUrlOptions): Promise<string> {
  const client = getS3Client();
  const bucket = getSpacesBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(filename
      ? { ResponseContentDisposition: `attachment; filename="${filename}"` }
      : {}),
  });

  const url = await getSignedUrl(client, command, { expiresIn: ttlSeconds });

  log.debug('Presigned GET URL issued', { key, ttlSeconds });
  return url;
}

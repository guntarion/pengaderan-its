/**
 * src/lib/storage/s3-client.ts
 * NAWASENA M05 — S3Client singleton for DigitalOcean Spaces.
 *
 * Env vars required:
 *   SPACES_ACCESS_KEY    — DO Spaces access key
 *   SPACES_SECRET_KEY    — DO Spaces secret key
 *   SPACES_ENDPOINT      — e.g. https://sgp1.digitaloceanspaces.com
 *   SPACES_REGION        — e.g. sgp1
 *   SPACES_BUCKET        — bucket name e.g. nawasena-its-prod
 */

import { S3Client } from '@aws-sdk/client-s3';
import { createLogger } from '@/lib/logger';

const log = createLogger('storage:s3-client');

let _client: S3Client | null = null;

/**
 * Get (or create) the S3Client singleton for DigitalOcean Spaces.
 */
export function getS3Client(): S3Client {
  if (_client) return _client;

  const endpoint = process.env.SPACES_ENDPOINT;
  const region = process.env.SPACES_REGION ?? 'sgp1';
  const accessKeyId = process.env.SPACES_ACCESS_KEY;
  const secretAccessKey = process.env.SPACES_SECRET_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    log.warn('S3/Spaces credentials incomplete', {
      hasEndpoint: !!endpoint,
      hasKey: !!accessKeyId,
      hasSecret: !!secretAccessKey,
    });
  }

  _client = new S3Client({
    endpoint: endpoint ?? 'https://sgp1.digitaloceanspaces.com',
    region,
    credentials: {
      accessKeyId: accessKeyId ?? '',
      secretAccessKey: secretAccessKey ?? '',
    },
    forcePathStyle: false, // DO Spaces uses virtual-hosted style
  });

  log.debug('S3Client initialized', { endpoint, region });
  return _client;
}

/**
 * Check if S3/Spaces is configured (env vars present).
 */
export function isStorageConfigured(): boolean {
  return !!(
    process.env.SPACES_ENDPOINT &&
    process.env.SPACES_ACCESS_KEY &&
    process.env.SPACES_SECRET_KEY &&
    process.env.SPACES_BUCKET
  );
}

/**
 * Get the configured bucket name.
 */
export function getSpacesBucket(): string {
  const bucket = process.env.SPACES_BUCKET;
  if (!bucket) {
    throw new Error('SPACES_BUCKET env var not configured');
  }
  return bucket;
}

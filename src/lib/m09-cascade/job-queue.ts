/**
 * src/lib/m09-cascade/job-queue.ts
 * NAWASENA M09 — Red flag cascade job queue using Redis.
 *
 * Uses Redis SETNX for deduplication (one cascade per KPLogDaily).
 * Job payload stored in Redis list 'm09:cascade-queue'.
 *
 * Degrades gracefully if Redis is not configured.
 */

import { createLogger } from '@/lib/logger';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';

const log = createLogger('m09:cascade-job-queue');

const DEDUPE_TTL_SECONDS = 30 * 60; // 30 minutes
const CASCADE_QUEUE_KEY = 'm09:cascade-queue';

export type CascadeSeverity = 'SEVERE' | 'NORMAL';

export interface CascadeJob {
  kpLogDailyId: string;
  severity: CascadeSeverity;
  redFlagTypes: string[];
  enqueuedAt: string; // ISO string
}

/**
 * Enqueue a cascade job for a KPLogDaily entry.
 * Uses SETNX dedupe to prevent duplicate jobs within 30 minutes.
 */
export async function enqueueCascadeJob(
  kpLogDailyId: string,
  severity: CascadeSeverity,
  redFlagTypes: string[],
): Promise<void> {
  log.info('Enqueueing cascade job', { kpLogDailyId, severity, redFlagTypes });

  if (!isRedisConfigured()) {
    log.warn('Redis not configured — cascade job not enqueued', { kpLogDailyId });
    return;
  }

  const redis = getRedisClient();
  const dedupeKey = `m09-cascade:${kpLogDailyId}`;

  try {
    // Dedupe: NX = only set if not exists
    const wasSet = await redis.set(dedupeKey, '1', {
      ex: DEDUPE_TTL_SECONDS,
      nx: true,
    });

    if (!wasSet) {
      log.debug('Cascade job already enqueued (dedupe)', { kpLogDailyId });
      return;
    }

    const job: CascadeJob = {
      kpLogDailyId,
      severity,
      redFlagTypes,
      enqueuedAt: new Date().toISOString(),
    };

    await redis.lpush(CASCADE_QUEUE_KEY, JSON.stringify(job));

    log.info('Cascade job enqueued', { kpLogDailyId, severity });
  } catch (err) {
    log.error('Failed to enqueue cascade job', { kpLogDailyId, error: err });
    // Don't throw — cascade failure should not block the main submit flow
  }
}

/**
 * Dequeue up to N cascade jobs from the queue.
 */
export async function dequeueCascadeJobs(maxJobs: number = 10): Promise<CascadeJob[]> {
  if (!isRedisConfigured()) {
    return [];
  }

  const redis = getRedisClient();
  const jobs: CascadeJob[] = [];

  try {
    for (let i = 0; i < maxJobs; i++) {
      const raw = await redis.rpop(CASCADE_QUEUE_KEY);
      if (!raw) break;

      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        jobs.push(parsed as CascadeJob);
      } catch (parseErr) {
        log.warn('Failed to parse cascade job', { raw, error: parseErr });
      }
    }
  } catch (err) {
    log.error('Failed to dequeue cascade jobs', { error: err });
  }

  return jobs;
}

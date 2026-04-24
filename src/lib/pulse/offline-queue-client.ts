/**
 * src/lib/pulse/offline-queue-client.ts
 * NAWASENA M04 — IndexedDB-backed offline pulse queue.
 *
 * Uses idb-keyval for simple key-value IndexedDB access.
 * Queue key: 'pulse:queue' → array of queued items.
 *
 * Features:
 * - enqueuePulse: add item to queue
 * - syncQueue: send all queued items to /api/pulse/sync
 * - startBackgroundSync: listen for online event + periodic retry
 * - Exponential backoff with ±20% jitter
 *
 * NOTE: This file is client-side only (uses IndexedDB / window APIs).
 */

'use client';

import { get, set } from 'idb-keyval';

const QUEUE_KEY = 'pulse:queue';
const MAX_QUEUE_SIZE = 30;
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BASE_BACKOFF_MS = 5000;
const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 10;

export interface QueuedPulse {
  tempId: string;          // client-generated UUID
  mood: number;            // 1-5
  emoji: string;
  comment?: string | null;
  recordedAt: string;      // ISO string (UTC)
  queuedAt: string;        // ISO string (when added to queue)
  retryCount: number;
  nextRetryAt: string;     // ISO string
}

/**
 * Add a pulse to the offline queue.
 */
export async function enqueuePulse(
  item: Omit<QueuedPulse, 'queuedAt' | 'retryCount' | 'nextRetryAt'>,
): Promise<void> {
  const existing: QueuedPulse[] = (await get(QUEUE_KEY)) ?? [];

  // Limit queue size
  if (existing.length >= MAX_QUEUE_SIZE) {
    // Drop oldest if at max capacity
    existing.shift();
  }

  const now = new Date().toISOString();
  const newItem: QueuedPulse = {
    ...item,
    queuedAt: now,
    retryCount: 0,
    nextRetryAt: now,
  };

  await set(QUEUE_KEY, [...existing, newItem]);
}

/**
 * Get all queued pulses.
 */
export async function getQueuedPulses(): Promise<QueuedPulse[]> {
  return (await get(QUEUE_KEY)) ?? [];
}

/**
 * Remove successfully synced items from the queue by tempId.
 */
export async function removeFromQueue(tempIds: string[]): Promise<void> {
  const existing: QueuedPulse[] = (await get(QUEUE_KEY)) ?? [];
  const filtered = existing.filter((item) => !tempIds.includes(item.tempId));
  await set(QUEUE_KEY, filtered);
}

/**
 * Clear all queued pulses (e.g. after full sync success).
 */
export async function clearQueue(): Promise<void> {
  await set(QUEUE_KEY, []);
}

/**
 * Calculate exponential backoff with ±20% jitter.
 */
function calculateBackoff(retryCount: number): number {
  const base = BASE_BACKOFF_MS * Math.pow(2, retryCount);
  const capped = Math.min(base, MAX_BACKOFF_MS);
  const jitter = capped * 0.2 * (Math.random() * 2 - 1); // ±20%
  return Math.max(BASE_BACKOFF_MS, capped + jitter);
}

/**
 * Sync all queued pulses to the backend.
 * Sends chunks of up to 30 items to /api/pulse/sync.
 * Returns { synced, skipped, failed } counts.
 */
export async function syncQueue(csrfToken?: string): Promise<{
  synced: number;
  skipped: number;
  failed: number;
}> {
  const queued = await getQueuedPulses();

  if (queued.length === 0) {
    return { synced: 0, skipped: 0, failed: 0 };
  }

  const now = new Date();
  const readyItems = queued.filter(
    (item) => item.retryCount < MAX_RETRY_ATTEMPTS && new Date(item.nextRetryAt) <= now,
  );

  if (readyItems.length === 0) {
    return { synced: 0, skipped: queued.length, failed: 0 };
  }

  // Send in a single batch (max 30)
  const batch = readyItems.slice(0, 30);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  let synced = 0;
  let failed = 0;

  try {
    const res = await fetch('/api/pulse/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: batch.map((item) => ({
          clientTempId: item.tempId,
          mood: item.mood,
          emoji: item.emoji,
          comment: item.comment,
          recordedAt: item.recordedAt,
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json() as { data: Array<{ clientTempId: string; status: string }> };
      const results = data.data ?? [];

      const syncedTempIds: string[] = [];
      const updatedQueue = [...queued];

      for (const result of results) {
        if (result.status === 'OK' || result.status === 'DUPLICATE' || result.status === 'REJECTED_TOO_OLD') {
          syncedTempIds.push(result.clientTempId);
          synced++;
        }
      }

      // Remove synced items
      await removeFromQueue(syncedTempIds);

      // Update retry state for remaining items
      const remaining = updatedQueue.filter((item) => !syncedTempIds.includes(item.tempId));
      if (remaining.length > 0) {
        const updated = remaining.map((item) => ({
          ...item,
          retryCount: item.retryCount + 1,
          nextRetryAt: new Date(Date.now() + calculateBackoff(item.retryCount + 1)).toISOString(),
        }));
        await set(QUEUE_KEY, updated);
      }
    } else {
      // Network error or server error — apply backoff to all batch items
      failed = batch.length;
      const updated = queued.map((item) => {
        const isBatchItem = batch.some((b) => b.tempId === item.tempId);
        if (!isBatchItem) return item;
        return {
          ...item,
          retryCount: item.retryCount + 1,
          nextRetryAt: new Date(Date.now() + calculateBackoff(item.retryCount + 1)).toISOString(),
        };
      });
      await set(QUEUE_KEY, updated);
    }
  } catch {
    // Network unavailable
    failed = batch.length;
  }

  return { synced, skipped: queued.length - readyItems.length, failed };
}

let syncIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start background sync listener.
 * Registers online event handler and periodic interval.
 * Call on app mount.
 */
export function startBackgroundSync(csrfToken?: string): () => void {
  const onOnline = () => {
    syncQueue(csrfToken).catch(() => {
      // Silently ignore sync errors
    });
  };

  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && navigator.onLine) {
      syncQueue(csrfToken).catch(() => {});
    }
  });

  // Listen for service worker sync message
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PULSE_SYNC_REQUESTED') {
        syncQueue(csrfToken).catch(() => {});
      }
    });
  }

  // Periodic sync every 5 minutes
  syncIntervalId = setInterval(() => {
    if (navigator.onLine) {
      syncQueue(csrfToken).catch(() => {});
    }
  }, SYNC_INTERVAL_MS);

  // Initial sync if online
  if (navigator.onLine) {
    syncQueue(csrfToken).catch(() => {});
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    if (syncIntervalId !== null) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
  };
}

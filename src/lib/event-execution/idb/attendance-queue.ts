/**
 * src/lib/event-execution/idb/attendance-queue.ts
 * NAWASENA M08 — IndexedDB queue for offline attendance stamps.
 *
 * Uses idb-keyval with a custom store for type safety.
 * Each queued item: { id, qrPayload, clientScanId, scanLocation, scannedAt, timestamp, attempts }
 */

import { createStore, get, set, del, keys, values } from 'idb-keyval';

export interface QueuedAttendanceStamp {
  id: string;               // UUID — same as clientScanId
  qrPayload: string;        // full QR URL
  clientScanId: string;     // UUID for idempotency
  scanLocation?: string;
  scannedAt: string;        // ISO timestamp
  queuedAt: number;         // Date.now()
  attempts: number;         // retry count
  lastError?: string;
}

// Dedicated IDB store for M08 attendance queue
const attendanceStore = createStore('nawasena-m08', 'attendance-queue');

export async function enqueueStamp(stamp: QueuedAttendanceStamp): Promise<void> {
  await set(stamp.id, stamp, attendanceStore);
}

export async function getAllQueued(): Promise<QueuedAttendanceStamp[]> {
  return values<QueuedAttendanceStamp>(attendanceStore);
}

export async function removeFromQueue(id: string): Promise<void> {
  await del(id, attendanceStore);
}

export async function updateAttempts(id: string, attempts: number, lastError?: string): Promise<void> {
  const existing = await get<QueuedAttendanceStamp>(id, attendanceStore);
  if (existing) {
    await set(id, { ...existing, attempts, lastError }, attendanceStore);
  }
}

export async function getQueueSize(): Promise<number> {
  const k = await keys(attendanceStore);
  return k.length;
}

export async function clearQueue(): Promise<void> {
  const allKeys = await keys(attendanceStore);
  await Promise.all(allKeys.map((k) => del(k, attendanceStore)));
}

/**
 * src/lib/time-capsule/edit-window.ts
 * NAWASENA M07 — Time Capsule entry edit window helper.
 *
 * Entries are editable within 24 hours of publishing.
 * editableUntil is stored on the entry for fast query.
 */

import type { TimeCapsuleEntry } from '@prisma/client';

/**
 * Check if a Time Capsule entry is still within its edit window.
 * An entry is editable if editableUntil > now.
 */
export function isEditable(entry: Pick<TimeCapsuleEntry, 'editableUntil' | 'publishedAt'>): boolean {
  if (!entry.publishedAt) return true; // draft entries are always editable
  return entry.editableUntil > new Date();
}

/**
 * Compute editableUntil timestamp from a publishedAt date.
 * editableUntil = publishedAt + 24 hours.
 */
export function computeEditableUntil(publishedAt: Date): Date {
  return new Date(publishedAt.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Compute remaining time in the edit window.
 * Returns null if the window has closed or entry is a draft.
 */
export function getRemainingEditTime(
  entry: Pick<TimeCapsuleEntry, 'editableUntil' | 'publishedAt'>,
): { hours: number; minutes: number; seconds: number } | null {
  if (!entry.publishedAt) return null;
  const remaining = entry.editableUntil.getTime() - Date.now();
  if (remaining <= 0) return null;

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds };
}

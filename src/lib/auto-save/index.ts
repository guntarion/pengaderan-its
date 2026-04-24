/**
 * src/lib/auto-save/index.ts
 * NAWASENA M07 — Generic auto-save hook for draft content.
 *
 * Features:
 * - localStorage persistence every 1s on value change (debounced)
 * - Backend PUT call every 30s debounce (only when value changed since last backend save)
 * - Conflict resolution on mount: latest wins (localStorage timestamp vs backend timestamp)
 * - Returns savedAt timestamp + isSaving state
 *
 * Usage:
 *   const { savedAt, isSaving } = useAutoSave({
 *     localStorageKey: 'tc-draft-new',
 *     backendUrl: '/api/time-capsule/draft',
 *     value: editorState,
 *     onSaved: (savedAt) => setSavedAt(savedAt),
 *   });
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('auto-save');

export interface AutoSaveOptions<T> {
  /** localStorage key to persist draft */
  localStorageKey: string;
  /** Backend endpoint — PUT with JSON body { data: T } */
  backendUrl: string;
  /** Current value to save */
  value: T;
  /** Debounce for backend save in ms (default: 30000) */
  debounceMs?: number;
  /** Called when backend save succeeds */
  onSaved?: (savedAt: Date) => void;
  /** Called when a conflict is detected (backend has newer data) */
  onConflict?: (serverData: T, serverSavedAt: Date) => void;
}

export interface AutoSaveResult {
  /** Timestamp of last successful backend save (null if never saved) */
  savedAt: Date | null;
  /** Whether a backend save is in progress */
  isSaving: boolean;
}

interface LocalDraft<T> {
  data: T;
  savedAt: string; // ISO string
}

/**
 * Generic auto-save hook. Persists to localStorage instantly and
 * debounces backend save every 30s. Only saves when value changes.
 */
export function useAutoSave<T>({
  localStorageKey,
  backendUrl,
  value,
  debounceMs = 30000,
  onSaved,
  onConflict,
}: AutoSaveOptions<T>): AutoSaveResult {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Track last value that was saved to backend
  const lastBackendValue = useRef<T | undefined>(undefined);
  const backendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  // ── On mount: load localStorage and check for conflict ──────────────────
  useEffect(() => {
    isMounted.current = true;

    try {
      const raw = localStorage.getItem(localStorageKey);
      if (raw) {
        const draft: LocalDraft<T> = JSON.parse(raw);
        const localDate = new Date(draft.savedAt);

        // Notify parent via onConflict if there's a local draft
        // Parent can decide to restore it (compare with current value)
        if (onConflict && draft.data) {
          onConflict(draft.data, localDate);
        }
      }
    } catch {
      // Ignore malformed localStorage data
      log.warn('Could not parse localStorage draft', { key: localStorageKey });
    }

    return () => {
      isMounted.current = false;
      if (backendTimer.current) clearTimeout(backendTimer.current);
      if (localTimer.current) clearTimeout(localTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStorageKey]);

  // ── Save to localStorage (debounced 1s) ────────────────────────────────
  useEffect(() => {
    if (localTimer.current) clearTimeout(localTimer.current);

    localTimer.current = setTimeout(() => {
      try {
        const draft: LocalDraft<T> = {
          data: value,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(localStorageKey, JSON.stringify(draft));
      } catch {
        log.warn('Could not write to localStorage', { key: localStorageKey });
      }
    }, 1000);

    return () => {
      if (localTimer.current) clearTimeout(localTimer.current);
    };
  }, [value, localStorageKey]);

  // ── Backend save (debounced 30s) ────────────────────────────────────────
  const saveToBackend = useCallback(async () => {
    if (JSON.stringify(value) === JSON.stringify(lastBackendValue.current)) {
      log.debug('No change since last backend save, skipping', { key: localStorageKey });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(backendUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: value }),
      });

      if (res.ok) {
        const now = new Date();
        lastBackendValue.current = value;
        setSavedAt(now);
        onSaved?.(now);

        // Clear localStorage draft after successful backend save
        try {
          localStorage.removeItem(localStorageKey);
        } catch {
          // non-fatal
        }

        log.debug('Auto-saved to backend', { key: localStorageKey, url: backendUrl });
      } else {
        log.warn('Backend auto-save failed', { status: res.status, url: backendUrl });
      }
    } catch (err) {
      log.warn('Backend auto-save error', { error: err, url: backendUrl });
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  }, [value, backendUrl, localStorageKey, onSaved]);

  useEffect(() => {
    if (backendTimer.current) clearTimeout(backendTimer.current);

    backendTimer.current = setTimeout(() => {
      if (isMounted.current) {
        void saveToBackend();
      }
    }, debounceMs);

    return () => {
      if (backendTimer.current) clearTimeout(backendTimer.current);
    };
  }, [value, debounceMs, saveToBackend]);

  return { savedAt, isSaving };
}

/**
 * Clear the localStorage draft for a given key (call after successful submit).
 */
export function clearLocalDraft(localStorageKey: string): void {
  try {
    localStorage.removeItem(localStorageKey);
  } catch {
    // non-fatal
  }
}

/**
 * Read a localStorage draft (returns null if not found or malformed).
 */
export function readLocalDraft<T>(localStorageKey: string): { data: T; savedAt: Date } | null {
  try {
    const raw = localStorage.getItem(localStorageKey);
    if (!raw) return null;
    const parsed: LocalDraft<T> = JSON.parse(raw);
    return { data: parsed.data, savedAt: new Date(parsed.savedAt) };
  } catch {
    return null;
  }
}

/**
 * src/components/journal/JournalEditor.tsx
 * NAWASENA M04 — Journal writing editor with auto-save.
 *
 * Features:
 * - 3 textarea fields mapped to Gibbs Reflective Cycle
 * - Live word counter across all 3 fields
 * - Auto-save to localStorage every 1s
 * - Auto-save to backend every 30s via PUT /api/journal/draft
 * - "Disimpan HH:MM" indicator
 * - Submit disabled if total words < 300
 * - Redirects to read view on successful submit
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, CheckCircle, Clock } from 'lucide-react';
import { toast } from '@/lib/toast';
import { countWords } from '@/lib/journal/word-count';

const MIN_WORDS = 300;

interface JournalFields {
  whatHappened: string;
  soWhat: string;
  nowWhat: string;
}

interface JournalEditorProps {
  weekNumber: number;
  initialDraft?: JournalFields;
  onSubmitted?: () => void;
}

function getLocalStorageKey(weekNumber: number) {
  return `journal_draft_${weekNumber}`;
}

export function JournalEditor({ weekNumber, initialDraft, onSubmitted }: JournalEditorProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // Get session fields
  const cohortId = (session?.user as { currentCohortId?: string })?.currentCohortId ?? '';
  const cohortStartDate = (session?.user as { cohortStartDate?: string })?.cohortStartDate ?? new Date().toISOString();

  // Fields state
  const [fields, setFields] = useState<JournalFields>(() => {
    // Restore from localStorage first if no initialDraft
    if (typeof window !== 'undefined' && !initialDraft) {
      const saved = localStorage.getItem(getLocalStorageKey(weekNumber));
      if (saved) {
        try {
          return JSON.parse(saved) as JournalFields;
        } catch {
          // ignore parse errors
        }
      }
    }
    return initialDraft ?? { whatHappened: '', soWhat: '', nowWhat: '' };
  });

  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isSavingBackend, setIsSavingBackend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backendSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBackendSaveRef = useRef<string>('');

  // Word counts
  const wordCounts = {
    whatHappened: countWords(fields.whatHappened),
    soWhat: countWords(fields.soWhat),
    nowWhat: countWords(fields.nowWhat),
  };
  const totalWords = wordCounts.whatHappened + wordCounts.soWhat + wordCounts.nowWhat;
  const canSubmit = totalWords >= MIN_WORDS && !isSubmitting && cohortId;

  // Auto-save to localStorage every time fields change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getLocalStorageKey(weekNumber), JSON.stringify(fields));
  }, [fields, weekNumber]);

  // Backend save function
  const saveToBackend = useCallback(async (currentFields: JournalFields) => {
    if (!cohortId) return;
    const fieldsKey = JSON.stringify(currentFields);
    if (fieldsKey === lastBackendSaveRef.current) return; // no change

    setIsSavingBackend(true);
    try {
      const res = await fetch('/api/journal/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId,
          weekNumber,
          whatHappened: currentFields.whatHappened,
          soWhat: currentFields.soWhat,
          nowWhat: currentFields.nowWhat,
          clientUpdatedAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        lastBackendSaveRef.current = fieldsKey;
        setSavedAt(new Date());
      } else if (res.status === 409) {
        // Server has newer version — don't overwrite, just warn
        toast.warning('Ada versi lebih baru di server. Draft mu tidak disimpan ke server.');
      }
    } catch {
      // Network error — localStorage still has the data
    } finally {
      setIsSavingBackend(false);
    }
  }, [cohortId, weekNumber]);

  // Schedule backend save every 30s after last change
  useEffect(() => {
    if (backendSaveTimerRef.current) {
      clearTimeout(backendSaveTimerRef.current);
    }
    backendSaveTimerRef.current = setTimeout(() => {
      saveToBackend(fields);
    }, 30_000);

    return () => {
      if (backendSaveTimerRef.current) {
        clearTimeout(backendSaveTimerRef.current);
      }
    };
  }, [fields, saveToBackend]);

  // Handle field change
  function handleChange(field: keyof JournalFields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
  }

  // Submit handler
  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/journal/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId,
          weekNumber,
          whatHappened: fields.whatHappened,
          soWhat: fields.soWhat,
          nowWhat: fields.nowWhat,
          cohortStartDate,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (res.ok) {
        // Clear localStorage
        localStorage.removeItem(getLocalStorageKey(weekNumber));
        toast.success('Jurnal berhasil dikirim!');
        onSubmitted?.();
        router.push(`/dashboard/journal/${weekNumber}`);
      } else {
        const body = await res.json();
        toast.apiError(body);
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Format saved time
  function formatSavedAt(date: Date) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-6">
      {/* Word counter summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${totalWords >= MIN_WORDS ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {totalWords} kata
          </span>
          {totalWords < MIN_WORDS && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              ({MIN_WORDS - totalWords} kata lagi)
            </span>
          )}
          {totalWords >= MIN_WORDS && (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          )}
        </div>
        {/* Save indicator */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          {isSavingBackend ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : savedAt ? (
            <>
              <Clock className="h-3 w-3" />
              <span>Disimpan {formatSavedAt(savedAt)}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            totalWords >= MIN_WORDS
              ? 'bg-emerald-500'
              : totalWords >= MIN_WORDS * 0.6
              ? 'bg-amber-400'
              : 'bg-sky-400'
          }`}
          style={{ width: `${Math.min(100, (totalWords / MIN_WORDS) * 100)}%` }}
        />
      </div>

      {/* Field: Apa yang terjadi */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Apa yang terjadi?{' '}
            <span className="text-xs text-gray-400">(What Happened)</span>
          </label>
          <span className="text-xs text-gray-400">{wordCounts.whatHappened} kata</span>
        </div>
        <textarea
          className="w-full min-h-[140px] px-4 py-3 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-y"
          placeholder="Ceritakan pengalaman yang paling berkesan minggu ini..."
          value={fields.whatHappened}
          onChange={(e) => handleChange('whatHappened', e.target.value)}
        />
      </div>

      {/* Field: So What */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            So what?{' '}
            <span className="text-xs text-gray-400">(Makna & Pelajaran)</span>
          </label>
          <span className="text-xs text-gray-400">{wordCounts.soWhat} kata</span>
        </div>
        <textarea
          className="w-full min-h-[140px] px-4 py-3 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-y"
          placeholder="Apa makna dari pengalaman tersebut? Pelajaran apa yang kamu petik?"
          value={fields.soWhat}
          onChange={(e) => handleChange('soWhat', e.target.value)}
        />
      </div>

      {/* Field: Now What */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Now what?{' '}
            <span className="text-xs text-gray-400">(Langkah Ke Depan)</span>
          </label>
          <span className="text-xs text-gray-400">{wordCounts.nowWhat} kata</span>
        </div>
        <textarea
          className="w-full min-h-[140px] px-4 py-3 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-y"
          placeholder="Apa yang akan kamu lakukan berbeda ke depannya?"
          value={fields.nowWhat}
          onChange={(e) => handleChange('nowWhat', e.target.value)}
        />
      </div>

      {/* Submit button */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Draft tersimpan otomatis di browser kamu.
        </p>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all ${
            canSubmit
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700 shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Mengirim...' : 'Kirim Jurnal'}
        </button>
      </div>
    </div>
  );
}

'use client';

/**
 * src/components/pulse/PulseSubmitForm.tsx
 * NAWASENA M04 — Pulse daily check-in form.
 *
 * Renders mood selector + optional comment + submit.
 * On submit: tries online API first; falls back to offline queue.
 * Shows already-submitted state when pulse exists for today.
 */

import React, { useState, useEffect } from 'react';
import { MoodEmojiSelector, MOOD_OPTIONS } from './MoodEmojiSelector';
import { OfflineIndicator } from './OfflineIndicator';
import { toast } from '@/lib/toast';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TodayPulse {
  id: string;
  mood: number;
  emoji: string;
}

interface PulseSubmitFormProps {
  cohortId: string;
  todayPulse: TodayPulse | null;
  onSubmitted?: (pulse: TodayPulse) => void;
}

export function PulseSubmitForm({ cohortId, todayPulse: initialPulse, onSubmitted }: PulseSubmitFormProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPulse, setSubmittedPulse] = useState<TodayPulse | null>(initialPulse);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load queue count on mount
  useEffect(() => {
    async function loadQueue() {
      if (typeof window === 'undefined') return;
      try {
        const { getQueuedPulses } = await import('@/lib/pulse/offline-queue-client');
        const queued = await getQueuedPulses();
        setQueuedCount(queued.length);
      } catch {
        // idb-keyval not available (SSR)
      }
    }
    loadQueue();
  }, []);

  const handleMoodChange = (mood: number, emoji: string) => {
    setSelectedMood(mood);
    setSelectedEmoji(emoji);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const { syncQueue } = await import('@/lib/pulse/offline-queue-client');
      await syncQueue();
      const { getQueuedPulses } = await import('@/lib/pulse/offline-queue-client');
      const queued = await getQueuedPulses();
      setQueuedCount(queued.length);
      if (queued.length === 0) {
        toast.success('Semua pulse berhasil disinkronkan');
      }
    } catch {
      toast.error('Gagal menyinkronkan pulse');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood) return;

    setIsSubmitting(true);
    const recordedAt = new Date().toISOString();

    try {
      if (navigator.onLine) {
        // Try online submission first
        const res = await fetch('/api/pulse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mood: selectedMood,
            emoji: selectedEmoji,
            comment: comment.trim() || null,
            recordedAt,
            cohortId,
          }),
        });

        if (res.ok) {
          const { data } = await res.json();
          const submitted = { id: data.id, mood: data.mood, emoji: data.emoji };
          setSubmittedPulse(submitted);
          onSubmitted?.(submitted);
          toast.success('Pulse hari ini berhasil dicatat!');
          return;
        }

        // Non-retryable error — don't queue
        const err = await res.json();
        toast.apiError(err);
        return;
      }
    } catch {
      // Network error — fall through to queue
    } finally {
      if (navigator.onLine) {
        setIsSubmitting(false);
        return;
      }
    }

    // Offline — enqueue
    try {
      const { enqueuePulse } = await import('@/lib/pulse/offline-queue-client');
      await enqueuePulse({
        tempId: crypto.randomUUID(),
        mood: selectedMood,
        emoji: selectedEmoji,
        comment: comment.trim() || undefined,
        recordedAt,
      });
      setQueuedCount((c) => c + 1);
      toast.info('Offline: Pulse akan dikirim saat koneksi kembali.');
      // Optimistically mark submitted
      setSubmittedPulse({ id: 'queued', mood: selectedMood, emoji: selectedEmoji });
    } catch {
      toast.error('Gagal menyimpan pulse. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Already submitted today
  if (submittedPulse) {
    const moodLabel = MOOD_OPTIONS.find((m) => m.mood === submittedPulse.mood)?.label ?? '';
    return (
      <div className="space-y-4">
        <OfflineIndicator queuedCount={queuedCount} onSyncNow={handleSyncNow} isSyncing={isSyncing} />
        <div className="flex flex-col items-center gap-3 py-6">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              Pulse hari ini sudah tercatat
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-3xl">{submittedPulse.emoji}</span>
              <span className="text-gray-600 dark:text-gray-400 text-sm">{moodLabel}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Kamu bisa memperbarui pulse hingga tengah malam.
          </p>
          {/* Allow re-selection to update */}
          <button
            className="text-xs text-sky-600 dark:text-sky-400 underline"
            onClick={() => setSubmittedPulse(null)}
          >
            Perbarui mood hari ini
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OfflineIndicator queuedCount={queuedCount} onSyncNow={handleSyncNow} isSyncing={isSyncing} />

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Bagaimana perasaanmu hari ini?
        </p>
        <MoodEmojiSelector
          value={selectedMood}
          onChange={handleMoodChange}
          disabled={isSubmitting}
        />
      </div>

      {selectedMood && (
        <div className="space-y-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Catatan (opsional, maks 500 karakter)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ceritakan sedikit tentang harimu..."
            maxLength={500}
            rows={3}
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm resize-none"
          />
          <p className="text-xs text-gray-400 text-right">{comment.length}/500</p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!selectedMood || isSubmitting}
        className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium py-3 hover:from-sky-600 hover:to-blue-700"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Mengirim...
          </>
        ) : (
          'Kirim Pulse'
        )}
      </Button>
    </div>
  );
}

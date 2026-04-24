'use client';

/**
 * src/components/m09/KPDailyForm.tsx
 * NAWASENA M09 — KP Daily Stand-up form.
 *
 * Combines MoodSliderWithSuggestion + RedFlagChecklist + anecdote textarea.
 * Handles submit + edit (within 48h window) with toast feedback.
 */

import { useState, useEffect } from 'react';
import { MoodSliderWithSuggestion } from './MoodSliderWithSuggestion';
import { RedFlagChecklist } from './RedFlagChecklist';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const log = createLogger('kp-daily-form');

interface SuggestedMoodData {
  suggestedMood: number | null;
  responderCount: number;
  groupSize: number;
}

interface ExistingEntry {
  id: string;
  moodScore: number;
  redFlagsObserved: string[];
  anecdoteNote: string | null;
  lainnyaNote?: string | null;
  date: string;
  canEdit: boolean;
}

interface KPDailyFormProps {
  existingEntry?: ExistingEntry | null;
  suggestedMoodData?: SuggestedMoodData | null;
  onSuccess?: () => void;
}

export function KPDailyForm({ existingEntry, suggestedMoodData, onSuccess }: KPDailyFormProps) {
  const [moodScore, setMoodScore] = useState(existingEntry?.moodScore ?? 3);
  const [redFlags, setRedFlags] = useState<string[]>(existingEntry?.redFlagsObserved ?? []);
  const [lainnyaNote, setLainnyaNote] = useState(existingEntry?.lainnyaNote ?? '');
  const [anecdoteNote, setAnecdoteNote] = useState(existingEntry?.anecdoteNote ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!existingEntry;
  const canEdit = !isEdit || existingEntry?.canEdit;

  useEffect(() => {
    if (existingEntry) {
      setMoodScore(existingEntry.moodScore);
      setRedFlags(existingEntry.redFlagsObserved);
      setAnecdoteNote(existingEntry.anecdoteNote ?? '');
      setLainnyaNote(existingEntry.lainnyaNote ?? '');
    }
  }, [existingEntry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEdit) {
      toast.error('Waktu edit telah habis (lebih dari 48 jam)');
      return;
    }

    setIsSubmitting(true);

    try {
      log.info('Submitting KP daily log', { isEdit, moodScore, flagCount: redFlags.length });

      const payload = {
        moodAvg: moodScore,
        redFlagsObserved: redFlags,
        redFlagOther: redFlags.includes('LAINNYA') ? lainnyaNote : undefined,
        anecdoteShort: anecdoteNote.trim() || undefined,
      };

      const res = await fetch('/api/kp/log/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }

      toast.success(isEdit ? 'Log harian berhasil diperbarui' : 'Log harian berhasil disimpan');
      onSuccess?.();
    } catch (err) {
      log.error('Failed to submit KP daily log', { err });
      toast.error('Gagal menyimpan log harian');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canEdit && isEdit) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Waktu edit telah habis
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
            Log harian hanya dapat diedit dalam 48 jam setelah pengisian. Catatan yang ada tetap
            tersimpan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mood Slider */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Mood Hari Ini
        </Label>
        <MoodSliderWithSuggestion
          value={moodScore}
          onChange={setMoodScore}
          suggestedMood={suggestedMoodData?.suggestedMood}
          responderCount={suggestedMoodData?.responderCount}
          groupSize={suggestedMoodData?.groupSize}
          disabled={isSubmitting}
        />
      </div>

      {/* Red Flag Checklist */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Red Flag (opsional)
        </Label>
        <p className="text-xs text-gray-400">
          Tandai jika ada kejadian yang perlu diperhatikan
        </p>
        <RedFlagChecklist
          selectedFlags={redFlags}
          onFlagsChange={setRedFlags}
          lainnyaNote={lainnyaNote}
          onLainnyaNoteChange={setLainnyaNote}
          disabled={isSubmitting}
        />
      </div>

      {/* Anecdote */}
      <div className="space-y-2">
        <Label
          htmlFor="anecdote"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Catatan Anekdotal (opsional)
        </Label>
        <p className="text-xs text-gray-400">
          Cerita singkat, momen menarik, atau observasi hari ini
        </p>
        <Textarea
          id="anecdote"
          value={anecdoteNote}
          onChange={(e) => setAnecdoteNote(e.target.value)}
          placeholder="Contoh: Maba terlihat lebih antusias saat sesi diskusi, tapi ada dua orang yang tampak kelelahan..."
          rows={4}
          maxLength={1000}
          disabled={isSubmitting}
          className="resize-none border-sky-200 dark:border-sky-800 focus:ring-sky-500 rounded-xl text-sm"
        />
        <p className="text-xs text-gray-400 text-right">{anecdoteNote.length}/1000</p>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl py-3 font-medium hover:from-sky-600 hover:to-blue-700 transition-all"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Menyimpan...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            {isEdit ? 'Perbarui Log Harian' : 'Simpan Log Harian'}
          </>
        )}
      </Button>
    </form>
  );
}

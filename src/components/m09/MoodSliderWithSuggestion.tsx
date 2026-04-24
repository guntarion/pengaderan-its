'use client';

/**
 * src/components/m09/MoodSliderWithSuggestion.tsx
 * NAWASENA M09 — Mood slider with Maba pulse suggestion badge.
 *
 * 48px touch target. Shows suggested mood from Maba pulse aggregate
 * as an informational badge below the slider.
 */

import { Slider } from '@/components/ui/slider';

interface MoodSliderProps {
  value: number;
  onChange: (value: number) => void;
  /** Suggested mood computed from Maba pulse aggregate (1-5 float) */
  suggestedMood?: number | null;
  /** Number of Maba responders for the suggestion */
  responderCount?: number;
  /** Total group size */
  groupSize?: number;
  disabled?: boolean;
}

const MOOD_LABELS: Record<number, { label: string; color: string; emoji: string }> = {
  1: { label: 'Sangat Buruk', color: 'text-red-500', emoji: '😞' },
  2: { label: 'Buruk', color: 'text-orange-500', emoji: '😕' },
  3: { label: 'Cukup', color: 'text-amber-500', emoji: '😐' },
  4: { label: 'Baik', color: 'text-sky-500', emoji: '🙂' },
  5: { label: 'Sangat Baik', color: 'text-emerald-500', emoji: '😄' },
};

export function MoodSliderWithSuggestion({
  value,
  onChange,
  suggestedMood,
  responderCount,
  groupSize,
  disabled,
}: MoodSliderProps) {
  const moodInfo = MOOD_LABELS[Math.round(value)] ?? MOOD_LABELS[3];

  return (
    <div className="space-y-4">
      {/* Current mood display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl leading-none">{moodInfo.emoji}</span>
          <div>
            <p className={`text-base font-semibold ${moodInfo.color}`}>{moodInfo.label}</p>
            <p className="text-xs text-gray-400">Mood hari ini</p>
          </div>
        </div>
        <div className={`text-2xl font-bold ${moodInfo.color}`}>{value}/5</div>
      </div>

      {/* Slider — 48px touch target via py-4 wrapper */}
      <div className="py-4">
        <Slider
          min={1}
          max={5}
          step={1}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          disabled={disabled}
          className="w-full"
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-xs text-gray-400 -mt-2">
        <span>😞 Sangat Buruk</span>
        <span>Sangat Baik 😄</span>
      </div>

      {/* Maba pulse suggestion badge */}
      {suggestedMood !== null && suggestedMood !== undefined && (
        <div className="p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl text-sm">
          <p className="text-sky-700 dark:text-sky-400 font-medium">
            Dari pulse Maba hari ini:{' '}
            <span className="font-bold">{suggestedMood.toFixed(1)}/5</span>{' '}
            dari{' '}
            <span className="font-bold">
              {responderCount ?? 0}/{groupSize ?? 0}
            </span>{' '}
            anggota
          </p>
          <p className="text-xs text-sky-500 dark:text-sky-500 mt-0.5">
            Skor ini dihitung dari pulse check harian Maba di kelompokmu
          </p>
        </div>
      )}
    </div>
  );
}

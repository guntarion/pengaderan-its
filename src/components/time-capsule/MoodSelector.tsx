'use client';

/**
 * src/components/time-capsule/MoodSelector.tsx
 * NAWASENA M07 — Mood selector (1-5 scale) for Time Capsule entries.
 *
 * Consistent with M04 PulseCheck.mood scale.
 */

import { cn } from '@/lib/utils';

const MOOD_OPTIONS = [
  { value: 1, emoji: '😔', label: 'Sangat Buruk' },
  { value: 2, emoji: '😕', label: 'Buruk' },
  { value: 3, emoji: '😐', label: 'Biasa' },
  { value: 4, emoji: '😊', label: 'Baik' },
  { value: 5, emoji: '😄', label: 'Sangat Baik' },
];

interface MoodSelectorProps {
  value?: number | null;
  onChange: (mood: number | null) => void;
  disabled?: boolean;
  className?: string;
}

export function MoodSelector({ value, onChange, disabled, className }: MoodSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Bagaimana perasaanmu saat menulis ini? (opsional)
      </p>
      <div className="flex gap-2">
        {MOOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === option.value ? null : option.value)}
            title={option.label}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-center transition-all',
              'border text-xs',
              disabled && 'opacity-50 cursor-not-allowed',
              value === option.value
                ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 shadow-sm'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/10',
            )}
          >
            <span className="text-lg leading-none">{option.emoji}</span>
            <span className="text-[10px] leading-tight hidden sm:block">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Get emoji for a mood value.
 */
export function getMoodEmoji(mood: number | null | undefined): string {
  if (!mood) return '—';
  return MOOD_OPTIONS.find((m) => m.value === mood)?.emoji ?? '—';
}

/**
 * Get label for a mood value.
 */
export function getMoodLabel(mood: number | null | undefined): string {
  if (!mood) return 'Tidak diisi';
  return MOOD_OPTIONS.find((m) => m.value === mood)?.label ?? 'Tidak diketahui';
}

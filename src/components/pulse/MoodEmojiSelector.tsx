'use client';

/**
 * src/components/pulse/MoodEmojiSelector.tsx
 * NAWASENA M04 — Mobile-first mood emoji selector.
 *
 * Displays 5 emoji buttons for mood 1-5 (48x48px minimum touch target).
 * Shows visual feedback for selected mood.
 */

import React from 'react';

export const MOOD_OPTIONS: { mood: number; emoji: string; label: string }[] = [
  { mood: 1, emoji: '😞', label: 'Sangat Sedih' },
  { mood: 2, emoji: '😔', label: 'Sedih' },
  { mood: 3, emoji: '😐', label: 'Biasa' },
  { mood: 4, emoji: '😊', label: 'Senang' },
  { mood: 5, emoji: '😄', label: 'Sangat Senang' },
];

interface MoodEmojiSelectorProps {
  value: number | null;
  onChange: (mood: number, emoji: string) => void;
  disabled?: boolean;
}

export function MoodEmojiSelector({ value, onChange, disabled = false }: MoodEmojiSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {MOOD_OPTIONS.map(({ mood, emoji, label }) => {
          const isSelected = value === mood;
          return (
            <button
              key={mood}
              type="button"
              onClick={() => !disabled && onChange(mood, emoji)}
              disabled={disabled}
              aria-label={label}
              className={`
                flex flex-col items-center gap-1 p-2 rounded-2xl transition-all
                min-w-[48px] min-h-[48px] flex-1
                ${isSelected
                  ? 'bg-sky-500 shadow-lg scale-110 ring-2 ring-sky-300'
                  : 'bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:scale-105'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-2xl leading-none select-none">{emoji}</span>
              <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

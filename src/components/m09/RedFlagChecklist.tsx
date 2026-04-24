'use client';

/**
 * src/components/m09/RedFlagChecklist.tsx
 * NAWASENA M09 — Red flag checklist for KP Daily log.
 *
 * 6 checkboxes. LAINNYA shows an inline text input for custom description.
 * Follows M09 red flag taxonomy: INJURY, SHUTDOWN, MENANGIS, KONFLIK, WITHDRAW, LAINNYA.
 */

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';

export const RED_FLAG_OPTIONS = [
  {
    value: 'INJURY',
    label: 'Cedera Fisik',
    description: 'Kecelakaan, cedera, atau kondisi fisik yang memerlukan perhatian medis',
    severity: 'severe' as const,
  },
  {
    value: 'SHUTDOWN',
    label: 'Shutdown / Mati Gaya',
    description: 'Maba tidak responsif, tidak bisa diajak komunikasi, atau mengalami dissasosiatif',
    severity: 'severe' as const,
  },
  {
    value: 'MENANGIS',
    label: 'Menangis',
    description: 'Maba menangis tanpa dapat ditenangkan atau menangis berkepanjangan',
    severity: 'normal' as const,
  },
  {
    value: 'KONFLIK',
    label: 'Konflik Antar Anggota',
    description: 'Pertengkaran atau konflik yang mengganggu dinamika kelompok',
    severity: 'normal' as const,
  },
  {
    value: 'WITHDRAW',
    label: 'Withdraw / Menarik Diri',
    description: 'Maba menghindari interaksi atau menarik diri dari kelompok',
    severity: 'normal' as const,
  },
  {
    value: 'LAINNYA',
    label: 'Lainnya',
    description: 'Hal lain yang perlu dicatat',
    severity: 'normal' as const,
  },
] as const;

export type RedFlagValue = (typeof RED_FLAG_OPTIONS)[number]['value'];

interface RedFlagChecklistProps {
  selectedFlags: string[];
  onFlagsChange: (flags: string[]) => void;
  lainnyaNote?: string;
  onLainnyaNoteChange?: (note: string) => void;
  disabled?: boolean;
}

export function RedFlagChecklist({
  selectedFlags,
  onFlagsChange,
  lainnyaNote = '',
  onLainnyaNoteChange,
  disabled,
}: RedFlagChecklistProps) {
  const [localLainnyaNote, setLocalLainnyaNote] = useState(lainnyaNote);

  const handleToggle = (flagValue: string) => {
    if (selectedFlags.includes(flagValue)) {
      onFlagsChange(selectedFlags.filter((f) => f !== flagValue));
    } else {
      onFlagsChange([...selectedFlags, flagValue]);
    }
  };

  const handleLainnyaNote = (note: string) => {
    setLocalLainnyaNote(note);
    onLainnyaNoteChange?.(note);
  };

  const hasSevereFlags = selectedFlags.some((f) =>
    RED_FLAG_OPTIONS.find((o) => o.value === f && o.severity === 'severe'),
  );

  return (
    <div className="space-y-3">
      {hasSevereFlags && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400">
            <span className="font-semibold">Red flag berat terdeteksi.</span> Laporan ini akan
            diteruskan ke Steering Committee untuk penanganan segera.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {RED_FLAG_OPTIONS.map((option) => (
          <div key={option.value}>
            <div
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                selectedFlags.includes(option.value)
                  ? option.severity === 'severe'
                    ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                    : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-sky-200 dark:hover:border-sky-800'
              }`}
              onClick={() => !disabled && handleToggle(option.value)}
            >
              <Checkbox
                id={`flag-${option.value}`}
                checked={selectedFlags.includes(option.value)}
                onCheckedChange={() => !disabled && handleToggle(option.value)}
                disabled={disabled}
                className="mt-0.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <Label
                  htmlFor={`flag-${option.value}`}
                  className={`text-sm font-medium cursor-pointer ${
                    option.severity === 'severe'
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                  {option.severity === 'severe' && (
                    <span className="ml-2 text-xs font-normal bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                      Berat
                    </span>
                  )}
                </Label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {option.description}
                </p>
              </div>
            </div>

            {/* LAINNYA inline text input */}
            {option.value === 'LAINNYA' && selectedFlags.includes('LAINNYA') && (
              <div className="ml-9 mt-2">
                <Input
                  value={localLainnyaNote}
                  onChange={(e) => handleLainnyaNote(e.target.value)}
                  placeholder="Deskripsikan red flag lainnya..."
                  disabled={disabled}
                  className="text-sm border-amber-200 dark:border-amber-800 focus:ring-amber-500"
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {localLainnyaNote.length}/200 karakter
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedFlags.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-1">
          Tidak ada red flag hari ini
        </p>
      )}
    </div>
  );
}

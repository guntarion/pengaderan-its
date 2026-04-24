'use client';

/**
 * src/components/pakta/PaktaCheckboxConfirm.tsx
 * Three acknowledgment checkboxes required before the user can proceed to the quiz.
 *
 * Props:
 *   reachBottom — whether the user has scrolled to the bottom (enables checkboxes)
 *   onConfirmed — called when all 3 are checked and user clicks "Lanjut ke Post-Test"
 */

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface PaktaCheckboxConfirmProps {
  reachBottom: boolean;
  onConfirmed: () => void;
  /** Label for the continue button (default: "Lanjut ke Post-Test") */
  continueLabel?: string;
}

const ACKNOWLEDGMENTS = [
  {
    id: 'read',
    text: 'Saya telah membaca seluruh isi dokumen pakta ini dengan seksama',
  },
  {
    id: 'understand',
    text: 'Saya memahami konsekuensi dari setiap ketentuan yang tercantum',
  },
  {
    id: 'agree',
    text: 'Saya menyetujui untuk mematuhi seluruh ketentuan yang berlaku',
  },
] as const;

export function PaktaCheckboxConfirm({
  reachBottom,
  onConfirmed,
  continueLabel = 'Lanjut ke Post-Test',
}: PaktaCheckboxConfirmProps) {
  const [checked, setChecked] = useState({
    read: false,
    understand: false,
    agree: false,
  });

  const allChecked = checked.read && checked.understand && checked.agree;
  const isDisabled = !reachBottom;

  const toggle = (id: 'read' | 'understand' | 'agree') => {
    if (isDisabled) return;
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      {!reachBottom && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Silakan baca dokumen sampai selesai untuk mengaktifkan pernyataan di bawah</span>
        </div>
      )}

      <div className="space-y-3">
        {ACKNOWLEDGMENTS.map((ack) => (
          <div
            key={ack.id}
            className={[
              'flex items-start gap-3 rounded-xl border p-4 transition-colors',
              isDisabled
                ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-50 cursor-not-allowed'
                : 'border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/20',
            ].join(' ')}
            onClick={() => toggle(ack.id)}
          >
            <Checkbox
              id={ack.id}
              checked={checked[ack.id]}
              onCheckedChange={() => toggle(ack.id)}
              disabled={isDisabled}
              className="mt-0.5"
            />
            <Label
              htmlFor={ack.id}
              className={[
                'text-sm leading-relaxed',
                isDisabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-200 cursor-pointer',
              ].join(' ')}
            >
              {ack.text}
            </Label>
          </div>
        ))}
      </div>

      <Button
        onClick={onConfirmed}
        disabled={!allChecked || isDisabled}
        className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90 disabled:opacity-50"
      >
        {continueLabel}
      </Button>
    </div>
  );
}

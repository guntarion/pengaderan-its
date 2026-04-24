'use client';

/**
 * src/components/triwulan/RevisionReasonDialog.tsx
 * NAWASENA M14 — Dialog for Pembina/BLM to submit revision reason (min 50 chars).
 */

import { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RevisionReasonDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  title?: string;
  description?: string;
}

const MIN_CHARS = 50;

export function RevisionReasonDialog({
  open,
  onClose,
  onConfirm,
  title = 'Minta Revisi',
  description = 'Jelaskan alasan permintaan revisi secara jelas dan spesifik.',
}: RevisionReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const charCount = reason.trim().length;
  const isInsufficient = charCount < MIN_CHARS;

  const handleConfirm = async () => {
    if (isInsufficient) return;
    setLoading(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
          rows={5}
          placeholder="Tuliskan alasan revisi di sini... (minimal 50 karakter)"
          className={`w-full px-4 py-3 text-sm rounded-xl border bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 resize-none ${
            isInsufficient && charCount > 0
              ? 'border-red-300 focus:ring-red-300 dark:border-red-700'
              : 'border-sky-200 focus:ring-sky-300 dark:border-sky-800'
          }`}
        />

        <p
          className={`text-xs mt-1.5 mb-4 ${
            isInsufficient && charCount > 0
              ? 'text-red-500'
              : 'text-gray-400'
          }`}
        >
          {charCount}/{MIN_CHARS} karakter minimum
        </p>

        {/* Warning */}
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Review saat ini akan disupersede. Review baru dengan status Draft akan dibuat dan SC
            akan perlu mengajukan ulang.
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isInsufficient || loading}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Menyimpan...
              </span>
            ) : (
              'Kirim Permintaan Revisi'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

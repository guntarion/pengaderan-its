'use client';

/**
 * src/components/triwulan/SignConfirmDialog.tsx
 * NAWASENA M14 — Dialog for Pembina to confirm signing.
 * URGENT reviews require: in-person tick + notes ≥ 200 chars.
 */

import { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TriwulanEscalationLevel } from '@prisma/client';

interface SignConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (notes: string, inPersonReviewed: boolean) => Promise<void>;
  escalationLevel: TriwulanEscalationLevel;
}

const MIN_NOTES_URGENT = 200;

export function SignConfirmDialog({
  open,
  onClose,
  onConfirm,
  escalationLevel,
}: SignConfirmDialogProps) {
  const [notes, setNotes] = useState('');
  const [inPersonReviewed, setInPersonReviewed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const isUrgent = escalationLevel === TriwulanEscalationLevel.URGENT;
  const noteLen = notes.trim().length;
  const urgentNotesOk = !isUrgent || noteLen >= MIN_NOTES_URGENT;
  const urgentInPersonOk = !isUrgent || inPersonReviewed;
  const canSign = urgentNotesOk && urgentInPersonOk;

  const handleConfirm = async () => {
    if (!canSign) return;
    setLoading(true);
    try {
      await onConfirm(notes.trim(), inPersonReviewed);
      setNotes('');
      setInPersonReviewed(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

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

        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">
          Tanda Tangani Review Triwulan
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Tanda tangan ini akan mencatat persetujuan Pembina secara resmi.
        </p>

        {/* URGENT warning */}
        {isUrgent && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                Review Eskalasi URGEN
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Wajib: tinjauan tatap muka + catatan minimal 200 karakter.
              </p>
            </div>
          </div>
        )}

        {/* In-person checkbox (URGENT only) */}
        {isUrgent && (
          <label className="flex items-start gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={inPersonReviewed}
              onChange={(e) => setInPersonReviewed(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Saya telah melakukan tinjauan tatap muka dengan SC sebelum menandatangani.
            </span>
          </label>
        )}

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Catatan Pembina{isUrgent ? ' (wajib ≥ 200 karakter)' : ' (opsional)'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={loading}
            rows={4}
            placeholder="Catatan tanda tangan..."
            className={`w-full px-4 py-3 text-sm rounded-xl border bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 resize-none ${
              isUrgent && noteLen > 0 && noteLen < MIN_NOTES_URGENT
                ? 'border-red-300 focus:ring-red-300 dark:border-red-700'
                : 'border-sky-200 focus:ring-sky-300 dark:border-sky-800'
            }`}
          />
          {isUrgent && (
            <p
              className={`text-xs mt-1 ${
                noteLen < MIN_NOTES_URGENT && noteLen > 0 ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {noteLen}/{MIN_NOTES_URGENT} karakter minimum
            </p>
          )}
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
            disabled={!canSign || loading}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Menyimpan...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Tanda Tangani
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

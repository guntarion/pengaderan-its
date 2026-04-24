'use client';

/**
 * src/components/verifier/RejectReasonModal.tsx
 * NAWASENA M05 — Modal for entering rejection reason (min 10 characters).
 */

import { useState } from 'react';

interface RejectReasonModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const MIN_LENGTH = 10;

export function RejectReasonModal({ isOpen, isLoading, onConfirm, onCancel }: RejectReasonModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const isValid = reason.trim().length >= MIN_LENGTH;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-red-100 dark:border-red-900 p-5 z-10">
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">Tolak Pengajuan</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Berikan alasan penolakan yang jelas agar mahasiswa dapat memperbaiki pengajuannya.
          Minimal {MIN_LENGTH} karakter.
        </p>

        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Contoh: Foto tidak jelas / terlihat blur. Mohon upload ulang dengan pencahayaan yang baik..."
          className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
        />

        <div className="flex items-center justify-between mt-1">
          <p
            className={`text-xs ${
              reason.trim().length < MIN_LENGTH ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {reason.trim().length}/{MIN_LENGTH} karakter minimum
          </p>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-900 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Tolak Pengajuan
          </button>
        </div>
      </div>
    </div>
  );
}

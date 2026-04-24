'use client';

/**
 * src/components/admin-passport/OverrideForm.tsx
 * NAWASENA M05 — SC/SUPERADMIN form to override entry status with reason (min 20 chars).
 */

import { useState, useCallback } from 'react';
import { toast } from '@/lib/toast';

interface OverrideFormProps {
  entryId: string;
  currentStatus: string;
  mabaName: string;
  itemName: string;
  onSuccess?: () => void;
}

type TargetStatus = 'VERIFIED' | 'REJECTED' | 'CANCELLED';

const MIN_REASON_LENGTH = 20;

export function OverrideForm({
  entryId,
  currentStatus,
  mabaName,
  itemName,
  onSuccess,
}: OverrideFormProps) {
  const [targetStatus, setTargetStatus] = useState<TargetStatus>('VERIFIED');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (reason.trim().length < MIN_REASON_LENGTH) {
      toast.error(`Alasan minimal ${MIN_REASON_LENGTH} karakter.`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/passport/override/${entryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }

      toast.success(`Entry berhasil di-override ke ${targetStatus}.`);
      setReason('');
      onSuccess?.();
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [entryId, targetStatus, reason, onSuccess]);

  const isValid = reason.trim().length >= MIN_REASON_LENGTH;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-orange-100 dark:border-orange-900 p-5 space-y-4">
      <div className="flex items-start gap-2">
        <span className="text-orange-500 text-lg">⚠️</span>
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Override Entry</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {mabaName} · {itemName} · Status saat ini:{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">{currentStatus}</span>
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Ubah ke Status
        </label>
        <div className="flex gap-2">
          {(['VERIFIED', 'REJECTED', 'CANCELLED'] as TargetStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTargetStatus(s)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                targetStatus === s
                  ? s === 'VERIFIED'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : s === 'REJECTED'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-gray-500 text-white border-gray-500'
                  : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Alasan Override <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Jelaskan alasan override secara rinci (minimal 20 karakter)..."
          className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
        />
        <p
          className={`text-xs mt-1 ${
            reason.trim().length < MIN_REASON_LENGTH ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          {reason.trim().length}/{MIN_REASON_LENGTH} karakter minimum
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || isLoading}
        className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 dark:disabled:bg-orange-900 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {isLoading && (
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        Konfirmasi Override
      </button>
    </div>
  );
}

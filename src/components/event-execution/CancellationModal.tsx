'use client';

/**
 * src/components/event-execution/CancellationModal.tsx
 * NAWASENA M08 — Cancellation confirmation modal.
 *
 * - Reason textarea (min 20 char)
 * - Confirm checkbox with notification count
 * - Submit triggers lifecycle cancel action
 */

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { Loader2, XCircleIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CancellationModalProps {
  instanceId: string;
  version: number;
  confirmedCount?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CancellationModal({
  instanceId,
  version,
  confirmedCount = 0,
  onSuccess,
  onCancel,
}: CancellationModalProps) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = reason.length >= 20 && confirmed && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/lifecycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', version, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      toast.success('Kegiatan berhasil dibatalkan. Peserta akan dinotifikasi.');
      onSuccess();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-red-100 dark:border-red-900 w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <XCircleIcon className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Batalkan Kegiatan
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>

        {/* Warning */}
        {confirmedCount > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>{confirmedCount} peserta</strong> yang sudah RSVP akan dinotifikasi via sistem.
            </span>
          </div>
        )}

        {/* Reason */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Alasan Pembatalan
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(min 20 karakter)</span>
          </Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Jelaskan alasan pembatalan kegiatan ini secara jelas..."
            rows={4}
            className="rounded-xl border-gray-200 dark:border-gray-700 text-sm resize-none"
            autoFocus
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{reason.length < 20 ? `Minimal ${20 - reason.length} karakter lagi` : 'Cukup'}</span>
            <span>{reason.length}</span>
          </div>
        </div>

        {/* Confirm checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-red-500 focus:ring-red-500"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Saya memahami bahwa pembatalan ini akan mengirim notifikasi kepada semua peserta
            dan tindakan ini tidak dapat dibatalkan.
          </span>
        </label>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-xl text-sm h-9"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm h-9"
          >
            {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Batalkan Kegiatan
          </Button>
        </div>
      </div>
    </div>
  );
}

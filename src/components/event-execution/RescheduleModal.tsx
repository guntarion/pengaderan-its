'use client';

/**
 * src/components/event-execution/RescheduleModal.tsx
 * NAWASENA M08 — Reschedule confirmation modal.
 *
 * - Date picker for new scheduledAt
 * - Optional reason input
 * - Shows rescheduleCount remaining badge (max 3)
 */

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { Loader2, CalendarIcon, InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RescheduleModalProps {
  instanceId: string;
  currentScheduledAt: string;
  rescheduleCount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const MAX_RESCHEDULE = 3;

export function RescheduleModal({
  instanceId,
  currentScheduledAt,
  rescheduleCount,
  onSuccess,
  onCancel,
}: RescheduleModalProps) {
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const remaining = MAX_RESCHEDULE - rescheduleCount;
  const canSubmit = newScheduledAt.length > 0 && !submitting && remaining > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/lifecycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          version: 0, // reschedule doesn't use optimistic lock in this route
          newScheduledAt: new Date(newScheduledAt).toISOString(),
          reason: reason || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      toast.success('Jadwal kegiatan berhasil diubah. Peserta akan dinotifikasi.');
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
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-sky-100 dark:border-sky-900 w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
            <CalendarIcon className="h-5 w-5 text-sky-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Jadwal Ulang Kegiatan
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Peserta RSVP akan dinotifikasi perubahan jadwal.
            </p>
          </div>
        </div>

        {/* Reschedule count badge */}
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
          remaining > 1
            ? 'bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400'
            : remaining === 1
            ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
            : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
        }`}>
          <InfoIcon className="h-3.5 w-3.5 shrink-0" />
          <span>
            {remaining > 0
              ? `Tersisa ${remaining}x kesempatan reschedule (dari maks ${MAX_RESCHEDULE}x)`
              : 'Batas maksimal reschedule sudah tercapai'}
          </span>
        </div>

        {remaining <= 0 ? (
          <p className="text-sm text-red-600 dark:text-red-400 text-center py-2">
            Kegiatan ini sudah di-reschedule sebanyak {rescheduleCount}x dan tidak bisa dijadwal ulang lagi.
          </p>
        ) : (
          <>
            {/* Current schedule */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Jadwal saat ini:{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {new Date(currentScheduledAt).toLocaleString('id-ID', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </span>
            </div>

            {/* New date */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Jadwal Baru
              </Label>
              <Input
                type="datetime-local"
                value={newScheduledAt}
                onChange={(e) => setNewScheduledAt(e.target.value)}
                className="rounded-xl border-gray-200 dark:border-gray-700 text-sm"
                autoFocus
              />
            </div>

            {/* Optional reason */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Alasan (opsional)
              </Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Alasan perubahan jadwal..."
                className="rounded-xl border-gray-200 dark:border-gray-700 text-sm"
              />
            </div>
          </>
        )}

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
          {remaining > 0 && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm h-9"
            >
              {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Simpan Jadwal
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * src/components/event-execution/LifecycleControls.tsx
 * NAWASENA M08 — Instance lifecycle control buttons.
 *
 * Shows context-appropriate action buttons based on current status.
 * Uses useConfirm for destructive actions.
 */

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/hooks/useConfirm';
import {
  PlayIcon,
  CheckCircle2Icon,
  XCircleIcon,
  CalendarIcon,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type InstanceStatus = 'PLANNED' | 'RUNNING' | 'DONE' | 'CANCELLED';

interface LifecycleControlsProps {
  instanceId: string;
  status: InstanceStatus;
  version: number;
  onSuccess: () => void;
}

export function LifecycleControls({
  instanceId,
  status,
  version,
  onSuccess,
}: LifecycleControlsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const { confirm, ConfirmDialog } = useConfirm();

  const doAction = async (
    action: string,
    extraPayload: Record<string, unknown> = {},
  ) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/lifecycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version, ...extraPayload }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      toast.success(
        action === 'start'
          ? 'Kegiatan dimulai!'
          : action === 'finish'
          ? 'Kegiatan selesai!'
          : action === 'cancel'
          ? 'Kegiatan dibatalkan.'
          : 'Kegiatan dijadwal ulang.',
      );
      onSuccess();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(null);
      setShowCancelForm(false);
      setShowRescheduleForm(false);
    }
  };

  const handleStart = async () => {
    const ok = await confirm('Mulai kegiatan?', 'Status akan berubah ke RUNNING. RSVP baru tidak akan diterima.');
    if (!ok) return;
    await doAction('start');
  };

  const handleFinish = async () => {
    const ok = await confirm(
      'Selesaikan kegiatan?',
      'Status akan berubah ke DONE. Kehadiran yang belum tercatat akan otomatis ALPA. NPS akan dibuka.',
    );
    if (!ok) return;
    await doAction('finish');
  };

  const handleCancel = async () => {
    if (cancelReason.length < 20) {
      toast.error('Alasan pembatalan minimal 20 karakter.');
      return;
    }
    await doAction('cancel', { reason: cancelReason });
  };

  const handleReschedule = async () => {
    if (!newScheduledAt) {
      toast.error('Tanggal baru wajib diisi.');
      return;
    }
    await doAction('reschedule', { newScheduledAt });
  };

  if (status === 'DONE' || status === 'CANCELLED') {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Status kegiatan sudah final: <strong>{status}</strong>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {status === 'PLANNED' && (
          <Button
            type="button"
            size="sm"
            onClick={handleStart}
            disabled={loading !== null}
            className="rounded-xl bg-green-500 hover:bg-green-600 text-white h-8"
          >
            {loading === 'start' ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlayIcon className="mr-1.5 h-3.5 w-3.5" />
            )}
            Mulai
          </Button>
        )}

        {status === 'RUNNING' && (
          <Button
            type="button"
            size="sm"
            onClick={handleFinish}
            disabled={loading !== null}
            className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white h-8"
          >
            {loading === 'finish' ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2Icon className="mr-1.5 h-3.5 w-3.5" />
            )}
            Selesaikan
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowRescheduleForm((v) => !v)}
          disabled={loading !== null}
          className="rounded-xl h-8 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800"
        >
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
          Jadwal Ulang
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowCancelForm((v) => !v)}
          disabled={loading !== null}
          className="rounded-xl h-8 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <XCircleIcon className="mr-1.5 h-3.5 w-3.5" />
          Batalkan
        </Button>
      </div>

      {/* Reschedule form */}
      {showRescheduleForm && (
        <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-sky-700 dark:text-sky-300">Jadwal Ulang Kegiatan</p>
          <div>
            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Tanggal & Waktu Baru</Label>
            <Input
              type="datetime-local"
              value={newScheduledAt}
              onChange={(e) => setNewScheduledAt(e.target.value)}
              className="rounded-xl border-gray-200 dark:border-gray-700 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleReschedule}
              disabled={loading === 'reschedule'}
              className="rounded-xl bg-sky-500 text-white h-7 text-xs"
            >
              {loading === 'reschedule' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Simpan
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowRescheduleForm(false)}
              className="rounded-xl h-7 text-xs"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Cancel form */}
      {showCancelForm && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-red-700 dark:text-red-300">Batalkan Kegiatan</p>
          <div>
            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
              Alasan Pembatalan (min 20 karakter)
            </Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Jelaskan alasan pembatalan..."
              rows={3}
              className="rounded-xl border-gray-200 dark:border-gray-700 text-sm resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{cancelReason.length}/20 min</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleCancel}
              disabled={loading === 'cancel' || cancelReason.length < 20}
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white h-7 text-xs"
            >
              {loading === 'cancel' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Konfirmasi Batalkan
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowCancelForm(false)}
              className="rounded-xl h-7 text-xs"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}

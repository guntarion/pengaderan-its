'use client';

/**
 * src/components/safeguard/SafeWordConfirmModal.tsx
 * NAWASENA M10 — 2-step confirmation modal for Safe Word quick report.
 *
 * Step 1: Confirm intention ("Apakah Anda yakin?")
 * Step 2: Fill optional details (affected users, short reason)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertOctagon, ArrowRight, Loader2 } from 'lucide-react';

interface SafeWordConfirmModalProps {
  open: boolean;
  cohortId: string;
  onClose: () => void;
  onConfirm: (data: { cohortId: string; reasonShort?: string }) => Promise<void>;
}

export function SafeWordConfirmModal({
  open,
  cohortId,
  onClose,
  onConfirm,
}: SafeWordConfirmModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [reasonShort, setReasonShort] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setStep(1);
    setReasonShort('');
    onClose();
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await onConfirm({ cohortId, reasonShort: reasonShort.trim() || undefined });
      handleClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertOctagon className="h-7 w-7 text-red-600 dark:text-red-400" />
                </div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                  TIME OUT — Lapor Insiden Darurat
                </DialogTitle>
              </div>
              <DialogDescription className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Kamu akan melaporkan insiden tingkat{' '}
                <strong className="text-red-600 dark:text-red-400">KRITIS (RED)</strong> sebagai
                Safe Word. Pelaporan ini akan segera dikirimkan ke SC dan Safeguard Officer.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/10 p-3 text-xs text-red-800 dark:text-red-300">
              Gunakan Safe Word hanya jika ada situasi darurat yang mengancam keselamatan fisik atau
              psikis peserta. Penyalahgunaan dapat berakibat pada tindakan disiplin.
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Batal
              </Button>
              <Button
                className="flex-1 bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                onClick={() => setStep(2)}
              >
                Ya, Lanjutkan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertOctagon className="h-7 w-7 text-red-600 dark:text-red-400" />
                </div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                  Detail Singkat (Opsional)
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                Berikan deskripsi singkat jika memungkinkan. Kamu dapat melengkapi laporan
                selanjutnya setelah situasi aman.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="reasonShort"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Deskripsi singkat (opsional)
                </Label>
                <Textarea
                  id="reasonShort"
                  value={reasonShort}
                  onChange={(e) => setReasonShort(e.target.value)}
                  placeholder="Jelaskan situasi singkat jika memungkinkan..."
                  maxLength={500}
                  rows={3}
                  className="mt-1 resize-none rounded-xl text-sm"
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {reasonShort.length}/500
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading} className="flex-1">
                Kembali
              </Button>
              <Button
                className="flex-1 bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Melaporkan...
                  </>
                ) : (
                  <>
                    <AlertOctagon className="mr-2 h-4 w-4" />
                    Kirim Laporan Darurat
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

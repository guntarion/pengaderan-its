'use client';

/**
 * /pakta/sign/[type]/reject
 * Reject a pakta version with a mandatory reason.
 *
 * Query params: versionId
 */

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('pakta-reject-page');

type PaktaType = 'PAKTA_PANITIA' | 'SOCIAL_CONTRACT_MABA' | 'PAKTA_PENGADER_2027';

const TYPE_LABELS: Record<PaktaType, string> = {
  PAKTA_PANITIA: 'Pakta Panitia',
  SOCIAL_CONTRACT_MABA: 'Social Contract MABA',
  PAKTA_PENGADER_2027: 'Pakta Pengader 2027',
};

export default function PaktaRejectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = params.type as PaktaType;
  const versionId = searchParams.get('versionId') ?? '';

  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejected, setRejected] = useState(false);

  const label = TYPE_LABELS[type] ?? type;
  const isValid = reason.trim().length >= 20;

  const handleReject = async () => {
    if (!isValid || !versionId) return;
    setIsSubmitting(true);
    log.info('Rejecting pakta', { versionId, type, reasonLength: reason.length });

    try {
      const res = await fetch('/api/pakta/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId, reason: reason.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.apiError(json);
        return;
      }

      setRejected(true);
      toast.success('Penolakan dicatat. Tim SC akan menghubungi Anda.');
    } catch (err) {
      toast.error('Kesalahan jaringan saat mengirim penolakan');
      log.error('Reject error', { error: err });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (rejected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Penolakan Tercatat
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Alasan Anda telah diteruskan ke tim SC. Anda masih dapat berubah pikiran dan
            menandatangani pakta ini kapan saja.
          </p>
          <Button
            onClick={() => router.push(`/pakta/sign/${type}?versionId=${versionId}`)}
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white"
          >
            Saya ingin tandatangan sekarang
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tolak {label}</h1>
              <p className="text-sm text-red-100 mt-0.5">
                Berikan alasan mengapa Anda tidak dapat menyetujui dokumen ini
              </p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Penolakan akan dilaporkan ke tim SC dan dapat mempengaruhi keterlibatan Anda di
              NAWASENA. Pastikan Anda memiliki alasan yang valid sebelum menolak.
            </p>
          </div>
        </div>

        {/* Reason form */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Alasan Penolakan
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan Anda menolak dokumen ini (minimal 20 karakter)..."
              className="min-h-[120px] resize-none rounded-xl"
              maxLength={2000}
            />
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>
                {reason.length < 20 && reason.length > 0 ? (
                  <span className="text-red-500">
                    Minimal 20 karakter ({20 - reason.length} lagi)
                  </span>
                ) : isValid ? (
                  <span className="text-emerald-500">Alasan valid</span>
                ) : (
                  'Minimal 20 karakter'
                )}
              </span>
              <span>{reason.length}/2000</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 border-gray-200 bg-transparent"
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleReject}
              disabled={!isValid || isSubmitting}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Mengirim...
                </span>
              ) : (
                'Kirim Penolakan'
              )}
            </Button>
          </div>
        </div>

        <div className="text-center">
          <Button
            variant="link"
            className="text-sky-600 dark:text-sky-400 text-sm"
            onClick={() => router.push(`/pakta/sign/${type}?versionId=${versionId}`)}
          >
            Kembali dan baca ulang dokumen
          </Button>
        </div>
      </div>
    </div>
  );
}

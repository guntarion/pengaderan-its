'use client';

/**
 * /pakta/sign/[type]/confirm
 * Pakta signing — Step 3: Final confirmation and digital signing.
 *
 * Query params: versionId, score
 * On sign → POST /api/pakta/sign → redirect to dashboard.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileSignature, ShieldCheck } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useConfirm } from '@/hooks/useConfirm';

const log = createLogger('pakta-confirm-page');

type PaktaType = 'PAKTA_PANITIA' | 'SOCIAL_CONTRACT_MABA' | 'PAKTA_PENGADER_2027';

const TYPE_LABELS: Record<PaktaType, string> = {
  PAKTA_PANITIA: 'Pakta Panitia',
  SOCIAL_CONTRACT_MABA: 'Social Contract MABA',
  PAKTA_PENGADER_2027: 'Pakta Pengader 2027',
};

export default function PaktaConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = params.type as PaktaType;
  const versionId = searchParams.get('versionId') ?? '';
  const score = parseInt(searchParams.get('score') ?? '0', 10);
  const { confirm, ConfirmDialog } = useConfirm();

  const [isSigning, setIsSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const label = TYPE_LABELS[type] ?? type;

  useEffect(() => {
    if (!versionId || !score) {
      router.replace(`/pakta/sign/${type}`);
    }
  }, [versionId, score, type, router]);

  const handleSign = async () => {
    const confirmed = await confirm({
      title: 'Konfirmasi Tanda Tangan Digital',
      description:
        'Dengan menandatangani, Anda menyetujui seluruh ketentuan pakta dan bersedia mematuhinya. Tanda tangan ini bersifat permanen.',
      confirmLabel: 'Ya, Tandatangani',
      cancelLabel: 'Batal',
      variant: 'default',
    });
    if (!confirmed) return;

    setIsSigning(true);
    log.info('Signing pakta', { versionId, type, score });

    try {
      const res = await fetch('/api/pakta/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId, quizScore: score }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.apiError(json);
        return;
      }

      setSigned(true);
      toast.success(`${label} berhasil ditandatangani!`);

      // Refresh session then redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);
    } catch (err) {
      toast.error('Kesalahan jaringan saat menandatangani');
      log.error('Sign error', { error: err });
    } finally {
      setIsSigning(false);
    }
  };

  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Berhasil Ditandatangani!
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {label} telah berhasil Anda tandatangani. Mengalihkan ke dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{label} — Konfirmasi Akhir</h1>
              <p className="text-sm text-emerald-100 mt-0.5">
                Skor Post-Test: {score}/100 — Lulus
              </p>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          {['Baca Dokumen', 'Post-Test', 'Konfirmasi'].map((step, idx) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className={[
                    'h-5 w-5 rounded-full text-xs flex items-center justify-center',
                    idx < 2
                      ? 'bg-emerald-500 text-white'
                      : 'bg-sky-500 text-white font-semibold',
                  ].join(' ')}
                >
                  {idx < 2 ? '✓' : idx + 1}
                </span>
                <span
                  className={
                    idx === 2
                      ? 'font-semibold text-sky-600 dark:text-sky-400'
                      : 'text-gray-400'
                  }
                >
                  {step}
                </span>
              </div>
              {idx < 2 && <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />}
            </div>
          ))}
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                Anda siap untuk menandatangani
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Anda telah membaca dokumen, menyetujui 3 pernyataan, dan lulus post-test dengan skor{' '}
                <strong className="text-emerald-600">{score}/100</strong>.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900 p-4 text-sm text-sky-700 dark:text-sky-300">
            Dengan menandatangani dokumen ini, Anda menyatakan bahwa Anda memahami dan bersedia
            mematuhi seluruh ketentuan yang tercantum. Tanda tangan digital ini sah dan memiliki
            kekuatan hukum yang setara dengan tanda tangan fisik dalam konteks kegiatan NAWASENA.
          </div>

          <Button
            onClick={handleSign}
            disabled={isSigning}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:opacity-90 gap-2"
          >
            <FileSignature className="h-4 w-4" />
            {isSigning ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Menandatangani...
              </span>
            ) : (
              'Tandatangani Pakta'
            )}
          </Button>

          <div className="text-center">
            <button
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline underline-offset-2"
              onClick={() => router.back()}
            >
              Kembali ke quiz
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog />
    </div>
  );
}

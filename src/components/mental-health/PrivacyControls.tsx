'use client';

/**
 * src/components/mental-health/PrivacyControls.tsx
 * NAWASENA M11 — Privacy controls for MH data.
 *
 * Allows the Maba to:
 *   1. View active consent status.
 *   2. Withdraw consent (with confirmation).
 *   3. Request data deletion (links to delete-request flow).
 *
 * PRIVACY-CRITICAL:
 *   - Withdrawal does NOT show any score or answer data.
 *   - No PII visible on this screen beyond the user's own cohort name.
 */

import React, { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { Shield, AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';

interface ConsentInfo {
  id: string;
  status: 'GRANTED' | 'WITHDRAWN' | 'EXPIRED_VERSION';
  cohortId: string;
  cohortName?: string;
  consentVersion: string;
  grantedAt: string;
}

interface PrivacyControlsProps {
  consents: ConsentInfo[];
  onConsentWithdrawn: (cohortId: string) => void;
}

const STATUS_LABELS: Record<ConsentInfo['status'], string> = {
  GRANTED: 'Aktif',
  WITHDRAWN: 'Dicabut',
  EXPIRED_VERSION: 'Perlu Pembaruan',
};

const STATUS_COLORS: Record<ConsentInfo['status'], string> = {
  GRANTED: 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
  WITHDRAWN: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700',
  EXPIRED_VERSION: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
};

export function PrivacyControls({ consents, onConsentWithdrawn }: PrivacyControlsProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  async function handleWithdraw(consent: ConsentInfo) {
    const confirmed = await confirm(
      'Cabut Persetujuan?',
      `Pencabutan persetujuan tidak menghapus data secara langsung. Data kamu akan diproses untuk penghapusan dalam 7 hari jika tidak ada sesi pendampingan aktif yang sedang berjalan. Kamu tetap dapat mengikuti kegiatan NAWASENA lainnya.`,
    );

    if (!confirmed) return;

    setWithdrawing(consent.cohortId);
    try {
      const res = await fetch('/api/mental-health/consent', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId: consent.cohortId }),
      });

      const json = (await res.json()) as { success: boolean; error?: { message: string } };

      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'Gagal mencabut persetujuan. Coba lagi.');
        return;
      }

      toast.success('Persetujuan berhasil dicabut.');
      onConsentWithdrawn(consent.cohortId);
    } catch {
      toast.error('Gagal terhubung ke server.');
    } finally {
      setWithdrawing(null);
    }
  }

  if (consents.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Belum ada data persetujuan skrining kesehatan mental.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {consents.map((consent) => (
          <div
            key={consent.id}
            className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col gap-4"
          >
            {/* Consent header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {consent.cohortName ?? `Kohort ${consent.cohortId.slice(0, 8)}`}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Versi persetujuan: <span className="font-mono">{consent.consentVersion}</span>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Disetujui:{' '}
                  {new Date(consent.grantedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[consent.status]}`}
              >
                {STATUS_LABELS[consent.status]}
              </span>
            </div>

            {/* Active consent actions */}
            {consent.status === 'GRANTED' && (
              <div className="flex flex-col gap-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Data kamu terproteksi dengan enkripsi penuh. Hanya konselor yang ditugaskan dapat melihat jawaban.</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleWithdraw(consent)}
                    disabled={withdrawing === consent.cohortId}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {withdrawing === consent.cohortId ? 'Memproses...' : 'Cabut Persetujuan'}
                  </button>
                  <a
                    href="/dashboard/mental-health/privacy/delete-request"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Minta Penghapusan Data
                  </a>
                </div>
              </div>
            )}

            {/* Withdrawn state info */}
            {consent.status === 'WITHDRAWN' && (
              <div className="flex items-start gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Persetujuan telah dicabut. Data akan dihapus dalam 7 hari jika tidak ada sesi pendampingan aktif.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog />
    </>
  );
}

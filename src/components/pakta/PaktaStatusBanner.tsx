'use client';

/**
 * src/components/pakta/PaktaStatusBanner.tsx
 * Shows a banner when the user has a pending pakta to sign or re-sign.
 *
 * Displayed on dashboard for users with paktaStatus = PENDING_RESIGN.
 */

import Link from 'next/link';
import { AlertCircle, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PaktaBannerType =
  | 'PAKTA_PANITIA'
  | 'SOCIAL_CONTRACT_MABA'
  | 'PAKTA_PENGADER_2027';

interface PaktaStatusBannerProps {
  type: PaktaBannerType;
  isResign?: boolean; // true = new version requires re-sign
}

const PAKTA_LABELS: Record<PaktaBannerType, string> = {
  PAKTA_PANITIA: 'Pakta Panitia',
  SOCIAL_CONTRACT_MABA: 'Social Contract MABA',
  PAKTA_PENGADER_2027: 'Pakta Pengader 2027',
};

export function PaktaStatusBanner({ type, isResign = false }: PaktaStatusBannerProps) {
  const label = PAKTA_LABELS[type];
  const signUrl = `/pakta/sign/${type}`;

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              {isResign
                ? `${label} telah diperbarui`
                : `Tanda tangan ${label} diperlukan`}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              {isResign
                ? 'Versi baru telah diterbitkan. Harap tanda tangan ulang untuk melanjutkan akses.'
                : 'Anda perlu menandatangani dokumen ini sebelum dapat mengakses seluruh fitur.'}
            </p>
          </div>
        </div>

        <Button
          asChild
          className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0 gap-2"
        >
          <Link href={signUrl}>
            <FileSignature className="h-4 w-4" />
            {isResign ? 'Tanda Tangan Ulang' : 'Tanda Tangani Sekarang'}
          </Link>
        </Button>
      </div>
    </div>
  );
}

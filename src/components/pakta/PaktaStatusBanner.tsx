'use client';

/**
 * src/components/pakta/PaktaStatusBanner.tsx
 * Shows a banner when the user has a pending pakta to sign or re-sign.
 *
 * Displayed on dashboard for users with paktaStatus = PENDING_RESIGN.
 *
 * Supports multi-type stacked banners (RV-D.3 — M01 Revisi Multi-HMJ):
 *   - SOCIAL_CONTRACT_MABA → "Pakta MABA (DIGITAL — Institusi)" banner
 *   - PAKTA_PANITIA         → "Pakta Panitia (ETIK — HMJ)" banner
 *   - PAKTA_PENGADER_2027   → "Pakta Pengader 2027 (ETIK — HMJ)" banner
 *
 * Usage (single banner):
 *   <PaktaStatusBanner type="SOCIAL_CONTRACT_MABA" isResign />
 *
 * Usage (multi-banner, stacked):
 *   <PaktaStatusBannerGroup items={[
 *     { type: 'SOCIAL_CONTRACT_MABA', isResign: true },
 *     { type: 'PAKTA_PANITIA', isResign: false },
 *   ]} />
 */

import Link from 'next/link';
import { AlertCircle, FileSignature, Globe, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PaktaBannerType =
  | 'PAKTA_PANITIA'
  | 'SOCIAL_CONTRACT_MABA'
  | 'PAKTA_PENGADER_2027';

interface PaktaStatusBannerProps {
  type: PaktaBannerType;
  isResign?: boolean; // true = new version requires re-sign
  orgName?: string;   // optional org name for ETIK types
}

// Label config per type
const PAKTA_CONFIG: Record<
  PaktaBannerType,
  { label: string; sublabel: string; scope: 'DIGITAL' | 'ETIK' }
> = {
  SOCIAL_CONTRACT_MABA: {
    label: 'Pakta MABA',
    sublabel: 'DIGITAL · Berlaku institusi-wide',
    scope: 'DIGITAL',
  },
  PAKTA_PANITIA: {
    label: 'Pakta Panitia',
    sublabel: 'ETIK · Berlaku per-HMJ',
    scope: 'ETIK',
  },
  PAKTA_PENGADER_2027: {
    label: 'Pakta Pengader 2027',
    sublabel: 'ETIK · Berlaku per-HMJ',
    scope: 'ETIK',
  },
};

export function PaktaStatusBanner({
  type,
  isResign = false,
  orgName,
}: PaktaStatusBannerProps) {
  const config = PAKTA_CONFIG[type];
  const signUrl = `/pakta/sign/${type}`;
  const ScopeIcon = config.scope === 'DIGITAL' ? Globe : Building2;

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                {isResign
                  ? `${config.label} telah diperbarui`
                  : `Tanda tangan ${config.label} diperlukan`}
              </p>
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5">
                <ScopeIcon className="h-3 w-3" />
                {config.scope === 'DIGITAL'
                  ? 'Institusi'
                  : orgName
                    ? orgName
                    : 'HMJ Anda'}
              </span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              {isResign
                ? 'Versi baru telah diterbitkan. Harap tanda tangan ulang untuk melanjutkan akses.'
                : 'Anda perlu menandatangani dokumen ini sebelum dapat mengakses seluruh fitur.'}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              {config.sublabel}
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

// ---- Multi-banner group ----

interface PaktaBannerItem {
  type: PaktaBannerType;
  isResign?: boolean;
  orgName?: string;
}

interface PaktaStatusBannerGroupProps {
  items: PaktaBannerItem[];
}

/**
 * Renders multiple PaktaStatusBanner stacked vertically.
 * Used when a user has multiple pending pakta (DIGITAL + ETIK, or multiple ETIK types).
 */
export function PaktaStatusBannerGroup({ items }: PaktaStatusBannerGroupProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <PaktaStatusBanner
          key={item.type}
          type={item.type}
          isResign={item.isResign}
          orgName={item.orgName}
        />
      ))}
    </div>
  );
}

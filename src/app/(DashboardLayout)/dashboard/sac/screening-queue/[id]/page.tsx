'use client';

/**
 * src/app/(DashboardLayout)/dashboard/sac/screening-queue/[id]/page.tsx
 * NAWASENA M11 — SAC case detail page.
 *
 * Fetches referral detail from /api/mental-health/referrals/[id]
 * and renders SACCaseDetail component.
 *
 * PRIVACY-CRITICAL: No Maba PII on this page.
 * Decryption is on-demand via SACCaseDetail.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { SACCaseDetail, type SACReferralDetail } from '@/components/mental-health/SACCaseDetail';
import { toast } from '@/lib/toast';
import { FileSearch } from 'lucide-react';

export default function SACCaseDetailPage() {
  const params = useParams();
  const referralId = params.id as string;

  const [referral, setReferral] = useState<SACReferralDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!referralId) return;

    async function fetchDetail() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/mental-health/referrals/${referralId}`);
        if (!res.ok) {
          const err = await res.json();
          toast.apiError(err);
          return;
        }
        const { data } = await res.json();
        setReferral(data);
      } catch {
        toast.error('Gagal memuat detail kasus');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetail();
  }, [referralId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/dashboard/sac/screening-queue"
              className="text-white/80 hover:text-white text-sm"
            >
              &larr;
            </Link>
            <div className="flex items-center gap-2">
              <FileSearch className="w-5 h-5" />
              <h1 className="text-xl font-bold">Detail Kasus SAC</h1>
            </div>
          </div>
          <p className="text-sm text-white/80">
            ID: {referralId.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto max-w-3xl px-4 pt-4">
        <DynamicBreadcrumb
          labels={{
            sac: 'SAC',
            'screening-queue': 'Screening Queue MH',
            [referralId]: referralId.slice(0, 8).toUpperCase(),
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-6">
        {isLoading ? (
          <SkeletonCard />
        ) : referral ? (
          <SACCaseDetail referral={referral} />
        ) : (
          <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
            Kasus tidak ditemukan atau Anda tidak memiliki akses.
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

/**
 * src/app/(DashboardLayout)/dashboard/sac/screening-queue/[id]/follow-up/page.tsx
 * NAWASENA M11 — SAC follow-up page: add note + update status.
 *
 * Fetches current status from referral detail API, then renders SACFollowUpForm.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { SACFollowUpForm } from '@/components/mental-health/SACFollowUpForm';
import { toast } from '@/lib/toast';
import { PenLine } from 'lucide-react';

export default function SACFollowUpPage() {
  const params = useParams();
  const referralId = params.id as string;

  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!referralId) return;

    async function fetchStatus() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/mental-health/referrals/${referralId}`);
        if (!res.ok) {
          const err = await res.json();
          toast.apiError(err);
          return;
        }
        const { data } = await res.json();
        setCurrentStatus(data?.status ?? 'PENDING');
      } catch {
        toast.error('Gagal memuat status referral');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStatus();
  }, [referralId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`/dashboard/sac/screening-queue/${referralId}`}
              className="text-white/80 hover:text-white text-sm"
            >
              &larr;
            </Link>
            <div className="flex items-center gap-2">
              <PenLine className="w-5 h-5" />
              <h1 className="text-xl font-bold">Tambah Catatan Konseling</h1>
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
            'follow-up': 'Catatan',
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-sky-100 dark:border-sky-900 p-6">
          {isLoading ? (
            <SkeletonCard />
          ) : currentStatus ? (
            <SACFollowUpForm referralId={referralId} currentStatus={currentStatus} />
          ) : (
            <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
              Gagal memuat data referral.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

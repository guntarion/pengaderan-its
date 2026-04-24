'use client';

/**
 * src/app/(DashboardLayout)/admin/passport/page.tsx
 * NAWASENA M05 — SC Dashboard: cohort-wide passport progress + stuck Maba + silent verifiers.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { CohortAggregateCard } from '@/components/admin-passport/CohortAggregateCard';
import { StuckMabaList } from '@/components/admin-passport/StuckMabaList';
import { SilentVerifierList } from '@/components/admin-passport/SilentVerifierList';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { toast } from '@/lib/toast';

interface AggregateData {
  totalMaba: number;
  completedMaba: number;
  aggregateProgress: {
    totalItems: number;
    verified: number;
    pending: number;
    rejected: number;
    notStarted: number;
    cancelled: number;
    generatedAt: string;
    byDimension: Record<string, {
      total: number;
      verified: number;
      pending: number;
      rejected: number;
      notStarted: number;
      cancelled: number;
    }>;
  };
  stuckMaba: Array<{
    userId: string;
    name: string;
    nrp: string | null;
    dimensi: string;
    daysSinceLastActivity: number;
  }>;
  silentVerifiers: Array<{
    userId: string;
    name: string;
    role: string;
    pendingCount: number;
    oldestPendingDays: number;
  }>;
}

export default function AdminPassportPage() {
  const { data: session } = useSession();
  const [aggregate, setAggregate] = useState<AggregateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nudgingUser, setNudgingUser] = useState<string | null>(null);

  const cohortId = (session?.user as { currentCohortId?: string })?.currentCohortId ?? '';

  useEffect(() => {
    if (!session || !cohortId) return;
    async function fetchAggregate() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/passport/aggregate?cohortId=${encodeURIComponent(cohortId)}`);
        if (res.ok) {
          const { data } = await res.json();
          setAggregate(data);
        }
      } catch {
        // Silent
      } finally {
        setIsLoading(false);
      }
    }
    fetchAggregate();
  }, [session, cohortId]);

  const handleNudgeMaba = async (userId: string) => {
    setNudgingUser(userId);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast.success('Notifikasi pengingat berhasil dikirim.');
    } catch {
      toast.error('Gagal mengirim notifikasi.');
    } finally {
      setNudgingUser(null);
    }
  };

  const handleNudgeVerifier = async (userId: string) => {
    setNudgingUser(userId);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast.success('Notifikasi pengingat berhasil dikirim ke verifikator.');
    } catch {
      toast.error('Gagal mengirim notifikasi.');
    } finally {
      setNudgingUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-xl font-bold">Admin — Passport Digital</h1>
          <p className="text-sm text-sky-100 mt-1">Dashboard progress passport angkatan</p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-5">
        <DynamicBreadcrumb />

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { href: '/admin/passport/qr-generator', label: 'QR Generator', icon: '📷' },
            { href: '/admin/passport/skem-export', label: 'Export SKEM', icon: '📊' },
            { href: '/admin/passport/overrides', label: 'Override Entry', icon: '⚙️' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
            >
              <span className="text-xl">{link.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Aggregate stats */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
            Progress Keseluruhan
          </h2>
          <ErrorBoundary>
            {isLoading ? (
              <SkeletonCard />
            ) : aggregate ? (
              <CohortAggregateCard summary={aggregate} />
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                Data tidak tersedia. Pastikan kamu sudah memilih cohort.
              </p>
            )}
          </ErrorBoundary>
        </div>

        {/* Stuck Maba */}
        {aggregate && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-amber-900 p-5">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">
              Mahasiswa yang Membutuhkan Dorongan
            </h2>
            <StuckMabaList
              entries={aggregate.stuckMaba}
              onNudge={handleNudgeMaba}
              isNudging={nudgingUser}
            />
          </div>
        )}

        {/* Silent verifiers */}
        {aggregate && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-900 p-5">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">
              Verifikator dengan Antrian Menumpuk
            </h2>
            <SilentVerifierList
              verifiers={aggregate.silentVerifiers}
              onNudge={handleNudgeVerifier}
              isNudging={nudgingUser}
            />
          </div>
        )}
      </div>
    </div>
  );
}

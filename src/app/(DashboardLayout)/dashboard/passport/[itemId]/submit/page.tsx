'use client';

/**
 * src/app/(DashboardLayout)/dashboard/passport/[itemId]/submit/page.tsx
 * NAWASENA M05 — Passport evidence submission page. Dispatches to evidence-type form.
 */

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SubmitFormDispatcher } from '@/components/passport/SubmitFormDispatcher';
import { EvidenceTypeBadge } from '@/components/shared/EvidenceTypeBadge';
import { SkeletonCard } from '@/components/shared/skeletons';

interface ItemInfo {
  id: string;
  namaItem: string;
  dimensi: string;
  evidenceType: string;
  keterangan: string | null;
}

export default function PassportSubmitPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = use(params);
  const searchParams = useSearchParams();
  const previousEntryId = searchParams.get('previousEntryId');
  const { data: session } = useSession();
  const [item, setItem] = useState<ItemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    async function fetchItem() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/passport/items/${itemId}`);
        if (res.ok) {
          const { data } = await res.json();
          setItem(data);
        }
      } catch {
        // Silent
      } finally {
        setIsLoading(false);
      }
    }
    fetchItem();
  }, [itemId, session]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="h-6 bg-white/20 rounded w-1/2 animate-pulse" />
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12 text-center text-gray-500">
        Item passport tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/dashboard/passport/${itemId}`}
              className="text-white/80 hover:text-white text-sm"
            >
              &larr; Kembali
            </Link>
          </div>
          <h1 className="text-lg font-bold leading-snug">
            {previousEntryId ? 'Kirim Ulang Bukti' : 'Ajukan Bukti'}
          </h1>
          <p className="text-sm text-sky-100 mt-1 truncate">{item.namaItem}</p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        <DynamicBreadcrumb />

        {/* Item info card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {item.namaItem}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.dimensi}</p>
              {item.keterangan && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{item.keterangan}</p>
              )}
            </div>
            <EvidenceTypeBadge type={item.evidenceType} />
          </div>
        </div>

        {/* Resubmit notice */}
        {previousEntryId && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <span className="font-semibold">Pengajuan Ulang:</span> Bukti baru ini akan terhubung
              ke riwayat pengajuan sebelumnya.
            </p>
          </div>
        )}

        {/* Form dispatcher */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <SubmitFormDispatcher item={item} previousEntryId={previousEntryId} />
        </div>
      </div>
    </div>
  );
}

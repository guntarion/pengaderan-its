'use client';

/**
 * src/app/(DashboardLayout)/dashboard/passport/[itemId]/page.tsx
 * NAWASENA M05 — Passport item detail: active entry status, evidence, history chain, CTA.
 */

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { StatusBadge } from '@/components/passport/StatusBadge';
import { EvidenceViewer } from '@/components/passport/EvidenceViewer';
import { ResubmitHistoryChain } from '@/components/passport/ResubmitHistoryChain';
import { EvidenceTypeBadge } from '@/components/shared/EvidenceTypeBadge';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/hooks/useConfirm';

interface EvidenceUpload {
  id: string;
  s3Key: string;
  mimeType: string;
  signedUrl: string | null;
}

interface HistoryEntry {
  id: string;
  status: string;
  submittedAt: Date | string;
  verifierNote: string | null;
  evidenceType: string;
}

interface EntryDetail {
  id: string;
  status: string;
  evidenceType: string;
  mabaNotes: string | null;
  verifierNote: string | null;
  submittedAt: string;
  item: { id: string; namaItem: string; dimensi: string; keterangan: string | null };
  verifier: { id: string; fullName: string; role: string } | null;
  evidenceUploads: EvidenceUpload[];
  history: HistoryEntry[];
}

interface ItemData {
  id: string;
  namaItem: string;
  dimensi: string;
  evidenceType: string;
  keterangan: string | null;
  currentEntry: EntryDetail | null;
}

export default function PassportItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = use(params);
  const { data: session } = useSession();
  const { confirm, ConfirmDialog } = useConfirm();

  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!session) return;
    async function fetchItem() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/passport/items/${itemId}`);
        if (res.ok) {
          const { data } = await res.json();
          setItemData(data);
        }
      } catch {
        // Silent
      } finally {
        setIsLoading(false);
      }
    }
    fetchItem();
  }, [itemId, session]);

  const handleCancel = async (entryId: string) => {
    const ok = await confirm(
      'Batalkan pengajuan ini?',
      'Setelah dibatalkan, kamu bisa mengajukan ulang bukti untuk item ini.',
    );
    if (!ok) return;

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/passport/${entryId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Dibatalkan oleh Maba' }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }
      toast.success('Pengajuan berhasil dibatalkan.');
      // Refresh
      const refreshed = await fetch(`/api/passport/items/${itemId}`);
      if (refreshed.ok) {
        const { data } = await refreshed.json();
        setItemData(data);
      }
    } catch {
      toast.error('Gagal membatalkan pengajuan.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="h-6 bg-white/20 rounded w-1/3 animate-pulse" />
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!itemData) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12 text-center text-gray-500">
        Item passport tidak ditemukan.
      </div>
    );
  }

  const entry = itemData.currentEntry;
  const canSubmit =
    !entry || entry.status === 'CANCELLED' || entry.status === 'REJECTED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/passport" className="text-white/80 hover:text-white text-sm">
              &larr; Passport
            </Link>
          </div>
          <h1 className="text-lg font-bold leading-snug">{itemData.namaItem}</h1>
          <p className="text-sm text-sky-100 mt-1">{itemData.dimensi}</p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        <DynamicBreadcrumb />

        {/* Item info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{itemData.dimensi}</p>
              {itemData.keterangan && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{itemData.keterangan}</p>
              )}
            </div>
            <EvidenceTypeBadge type={itemData.evidenceType} />
          </div>

          {/* Active entry status */}
          {entry && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status Pengajuan</p>
                  <div className="mt-1">
                    <StatusBadge
                      status={
                        entry.status as 'VERIFIED' | 'PENDING' | 'REJECTED' | 'CANCELLED'
                      }
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(entry.submittedAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  {entry.verifier && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Verifikator: {entry.verifier.fullName}
                    </p>
                  )}
                </div>
              </div>

              {/* Rejection note */}
              {entry.status === 'REJECTED' && entry.verifierNote && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-xl">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    <span className="font-semibold">Alasan penolakan:</span> {entry.verifierNote}
                  </p>
                </div>
              )}

              {/* Maba notes */}
              {entry.mabaNotes && (
                <div className="mt-2 p-2.5 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
                  <p className="text-xs text-sky-700 dark:text-sky-300">
                    <span className="font-semibold">Catatanmu:</span> {entry.mabaNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* No entry */}
          {!entry && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Belum ada pengajuan untuk item ini.
              </p>
            </div>
          )}
        </div>

        {/* Evidence viewer */}
        {entry && entry.evidenceUploads.length > 0 && (
          <ErrorBoundary>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Bukti Lampiran
              </h3>
              <div className="space-y-4">
                {entry.evidenceUploads.map((upload) => (
                  <EvidenceViewer
                    key={upload.id}
                    s3Key={upload.s3Key}
                    mimeType={upload.mimeType}
                    signedUrl={upload.signedUrl}
                    entryId={entry.id}
                  />
                ))}
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* Resubmit history */}
        {entry && entry.history && entry.history.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
            <ResubmitHistoryChain history={entry.history} />
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-3">
          {canSubmit && (
            <Link
              href={`/dashboard/passport/${itemId}/submit${
                entry?.id ? `?previousEntryId=${entry.id}` : ''
              }`}
              className="flex-1 text-center py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-colors"
            >
              {entry?.status === 'REJECTED' || entry?.status === 'CANCELLED'
                ? 'Kirim Ulang Bukti'
                : 'Ajukan Bukti'}
            </Link>
          )}

          {entry && entry.status === 'PENDING' && (
            <button
              type="button"
              onClick={() => handleCancel(entry.id)}
              disabled={isCancelling}
              className="flex-1 py-3 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCancelling && (
                <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              )}
              Batalkan
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog />
    </div>
  );
}

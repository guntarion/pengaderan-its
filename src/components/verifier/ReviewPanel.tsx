'use client';

/**
 * src/components/verifier/ReviewPanel.tsx
 * NAWASENA M05 — Evidence viewer + approve/reject action panel for verifier.
 *
 * Keyboard shortcuts: A = approve, R = open reject modal.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { EvidenceViewer } from '@/components/passport/EvidenceViewer';
import { StatusBadge } from '@/components/passport/StatusBadge';
import { EvidenceTypeBadge } from '@/components/shared/EvidenceTypeBadge';
import { RejectReasonModal } from './RejectReasonModal';
import { toast } from '@/lib/toast';

interface EvidenceUpload {
  id: string;
  s3Key: string;
  mimeType: string;
  signedUrl: string | null;
}

export interface ReviewEntryData {
  id: string;
  status: string;
  evidenceType: string;
  mabaNotes: string | null;
  submittedAt: string;
  item: { id: string; namaItem: string; dimensi: string };
  user: { id: string; fullName: string; nrp?: string | null };
  evidenceUploads: EvidenceUpload[];
}

interface ReviewPanelProps {
  entry: ReviewEntryData;
}

export function ReviewPanel({ entry }: ReviewPanelProps) {
  const router = useRouter();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/verifier/${entry.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }

      toast.success('Pengajuan berhasil disetujui.');
      router.push('/dashboard/verifier/queue');
      router.refresh();
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsApproving(false);
    }
  }, [entry.id, router]);

  const handleReject = useCallback(async (reason: string) => {
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/verifier/${entry.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }

      setShowRejectModal(false);
      toast.success('Pengajuan berhasil ditolak.');
      router.push('/dashboard/verifier/queue');
      router.refresh();
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsRejecting(false);
    }
  }, [entry.id, router]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === 'a' || e.key === 'A') handleApprove();
      if (e.key === 'r' || e.key === 'R') setShowRejectModal(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleApprove]);

  const isPending = entry.status === 'PENDING';
  const submittedDate = new Date(entry.submittedAt).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-5">
      {/* Entry header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
              {entry.item.namaItem}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{entry.item.dimensi}</p>
          </div>
          <StatusBadge status={entry.status as 'VERIFIED' | 'PENDING' | 'REJECTED' | 'CANCELLED'} />
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span>
            <span className="font-medium">Mahasiswa:</span> {entry.user.fullName}
            {entry.user.nrp && ` (${entry.user.nrp})`}
          </span>
          <span>
            <span className="font-medium">Dikirim:</span> {submittedDate}
          </span>
          <EvidenceTypeBadge type={entry.evidenceType} />
        </div>

        {entry.mabaNotes && (
          <div className="mt-3 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-900">
            <p className="text-xs text-sky-700 dark:text-sky-300">
              <span className="font-semibold">Catatan mahasiswa:</span> {entry.mabaNotes}
            </p>
          </div>
        )}
      </div>

      {/* Evidence viewer */}
      {entry.evidenceUploads.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Bukti Lampiran</h3>
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
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 text-center text-sm text-gray-500 dark:text-gray-400">
          Tidak ada file lampiran untuk bukti ini.
        </div>
      )}

      {/* Action buttons — sticky thumb zone on mobile */}
      {isPending && (
        <div className="sticky bottom-4 flex gap-3">
          <button
            type="button"
            onClick={() => setShowRejectModal(true)}
            disabled={isApproving || isRejecting}
            className="flex-1 py-3.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            ✕ Tolak
            <kbd className="hidden md:inline text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-mono">
              R
            </kbd>
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isApproving ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                ✓ Setujui
                <kbd className="hidden md:inline text-xs bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono">
                  A
                </kbd>
              </>
            )}
          </button>
        </div>
      )}

      <RejectReasonModal
        isOpen={showRejectModal}
        isLoading={isRejecting}
        onConfirm={handleReject}
        onCancel={() => setShowRejectModal(false)}
      />
    </div>
  );
}

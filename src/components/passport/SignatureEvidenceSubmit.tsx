'use client';

/**
 * src/components/passport/SignatureEvidenceSubmit.tsx
 * NAWASENA M05 — Verifier signature request. Maba selects verifier, adds notes, submits.
 *
 * No file upload needed — verifier will later review and approve/reject the submission.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';

interface SignatureEvidenceSubmitProps {
  itemId: string;
  itemName: string;
  previousEntryId?: string | null;
}

interface VerifierOption {
  id: string;
  fullName: string;
  role: string;
}

export function SignatureEvidenceSubmit({
  itemId,
  previousEntryId,
}: SignatureEvidenceSubmitProps) {
  const router = useRouter();
  const [verifiers, setVerifiers] = useState<VerifierOption[]>([]);
  const [verifierId, setVerifierId] = useState('');
  const [mabaNotes, setMabaNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    async function fetchVerifiers() {
      try {
        const res = await fetch('/api/users/verifiers');
        if (!res.ok) return;
        const { data } = await res.json();
        setVerifiers(data ?? []);
      } catch {
        // Non-critical — user can still proceed if list fails
      } finally {
        setIsFetching(false);
      }
    }
    fetchVerifiers();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!verifierId) {
      toast.error('Pilih verifikator terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/passport/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          evidenceType: 'TANDA_TANGAN',
          verifierId,
          mabaNotes: mabaNotes.trim() || undefined,
          previousEntryId: previousEntryId ?? undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }

      toast.success('Pengajuan tanda tangan berhasil dikirim! Menunggu verifikasi.');
      router.push(`/dashboard/passport/${itemId}`);
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [verifierId, itemId, mabaNotes, previousEntryId, router]);

  return (
    <div className="space-y-4">
      <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-3">
        <p className="text-xs text-violet-700 dark:text-violet-300">
          <span className="font-semibold">Bukti Tanda Tangan:</span> Pilih verifikator yang akan
          memverifikasi kehadiran atau aktivitasmu secara langsung.
        </p>
      </div>

      {/* Verifier selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Pilih Verifikator <span className="text-red-500">*</span>
        </label>
        {isFetching ? (
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        ) : (
          <select
            value={verifierId}
            onChange={(e) => setVerifierId(e.target.value)}
            className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="">-- Pilih Verifikator --</option>
            {verifiers.map((v) => (
              <option key={v.id} value={v.id}>
                {v.fullName} ({v.role})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Catatan untuk Verifikator (opsional)
        </label>
        <textarea
          value={mabaNotes}
          onChange={(e) => setMabaNotes(e.target.value)}
          rows={3}
          placeholder="Contoh: Saya hadir pada rapat koordinasi tanggal 12 April..."
          className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!verifierId || isLoading}
        className="w-full py-3 px-4 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:bg-violet-300 dark:disabled:bg-violet-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {isLoading && (
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {isLoading ? 'Mengirim...' : 'Kirim Permintaan Tanda Tangan'}
      </button>
    </div>
  );
}

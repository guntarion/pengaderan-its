'use client';

/**
 * src/components/anon-report/AttachmentDownloader.tsx
 * NAWASENA M12 — Download button for BLM/Satgas report attachments.
 *
 * Calls /api/anon-reports/[id]/attachment → gets signed URL → opens in new tab.
 * Shows EXIF status if available.
 */

import { useState } from 'react';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/toast';

interface AttachmentDownloaderProps {
  reportId: string;
  exifStripped?: boolean;
  attachmentKey?: string | null;
}

export function AttachmentDownloader({
  reportId,
  exifStripped,
  attachmentKey,
}: AttachmentDownloaderProps) {
  const [loading, setLoading] = useState(false);

  if (!attachmentKey) return null;

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/anon-reports/${reportId}/attachment`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message ?? 'Gagal mendapatkan URL unduhan');
      }

      const { signedUrl } = data.data;
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950/20 dark:text-sky-400 dark:hover:bg-sky-900/30"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Unduh Bukti
      </button>

      {typeof exifStripped !== 'undefined' && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          {exifStripped ? (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              EXIF status: Sudah dibersihkan
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              EXIF status: Menunggu pembersihan
            </>
          )}
        </p>
      )}
    </div>
  );
}

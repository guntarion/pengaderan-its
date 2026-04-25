'use client';

/**
 * src/components/passport/EvidenceViewer.tsx
 * NAWASENA M05 — Display evidence photo or PDF with URL refresh on tab focus.
 */

import { useState, useEffect, useCallback } from 'react';

interface EvidenceViewerProps {
  s3Key: string;
  mimeType: string;
  signedUrl: string | null;
  onRefreshUrl?: (s3Key: string) => Promise<string>;
  entryId?: string;
}

export function EvidenceViewer({
  s3Key,
  mimeType,
  signedUrl: initialUrl,
  onRefreshUrl,
}: EvidenceViewerProps) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl);
  const [lastLoadTime, setLastLoadTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshUrl = useCallback(async () => {
    if (!onRefreshUrl || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const fresh = await onRefreshUrl(s3Key);
      setCurrentUrl(fresh);
      setLastLoadTime(new Date());
    } catch {
      // Silently fail — user can reload manually
    } finally {
      setIsRefreshing(false);
    }
  }, [s3Key, onRefreshUrl, isRefreshing]);

  // Refresh URL on tab focus if > 10 minutes old
  useEffect(() => {
    const handleFocus = () => {
      const minutesSince = (Date.now() - lastLoadTime.getTime()) / 60000;
      if (minutesSince > 10 && onRefreshUrl) {
        refreshUrl();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [lastLoadTime, onRefreshUrl, refreshUrl]);

  if (!currentUrl) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada bukti tersedia</p>
      </div>
    );
  }

  if (mimeType === 'application/pdf') {
    return (
      <div className="relative w-full">
        <iframe
          src={currentUrl}
          className="w-full h-96 rounded-xl border border-sky-100 dark:border-sky-900"
          title="PDF Evidence"
        />
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-sky-600 dark:text-sky-400 hover:underline"
        >
          Buka PDF di tab baru →
        </a>
      </div>
    );
  }

  // Image (JPEG, PNG)
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentUrl}
        alt="Evidence"
        className="w-full max-h-96 object-contain rounded-xl border border-sky-100 dark:border-sky-900"
      />
      {isRefreshing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
          <div className="h-6 w-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {onRefreshUrl && (
        <button
          onClick={refreshUrl}
          className="mt-2 text-xs text-sky-600 dark:text-sky-400 hover:underline"
        >
          Perbarui URL (expires setelah 15 menit)
        </button>
      )}
    </div>
  );
}

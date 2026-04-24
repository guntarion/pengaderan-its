'use client';

/**
 * src/components/triwulan/PDFDownloadButton.tsx
 * NAWASENA M14 — Button to download the triwulan review PDF.
 * Polls pdfStatus and triggers download when ready.
 */

import { useState, useEffect } from 'react';
import { Download, Loader2, AlertCircle, Clock } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { PDFStatus } from '@prisma/client';

const log = createLogger('m14/pdf/download-button');
const POLL_INTERVAL_MS = 5000;

interface PDFDownloadButtonProps {
  reviewId: string;
  initialPdfStatus: PDFStatus;
  className?: string;
}

export function PDFDownloadButton({
  reviewId,
  initialPdfStatus,
  className = '',
}: PDFDownloadButtonProps) {
  const [pdfStatus, setPdfStatus] = useState<PDFStatus>(initialPdfStatus);
  const [downloading, setDownloading] = useState(false);

  // Poll while PENDING or RENDERING
  useEffect(() => {
    if (pdfStatus !== PDFStatus.PENDING && pdfStatus !== PDFStatus.RENDERING) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/triwulan/${reviewId}/pdf`);
        if (!res.ok) return;
        const data = await res.json();
        const newStatus: PDFStatus = data.data?.pdfStatus ?? PDFStatus.PENDING;
        if (newStatus !== pdfStatus) {
          setPdfStatus(newStatus);
        }
        if (newStatus === PDFStatus.READY || newStatus === PDFStatus.FAILED) {
          clearInterval(interval);
        }
      } catch (err) {
        log.warn('PDF status poll failed', { error: err });
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [reviewId, pdfStatus]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/triwulan/${reviewId}/pdf`);
      if (!res.ok) {
        const data = await res.json();
        toast.apiError(data);
        return;
      }
      const data = await res.json();
      const { downloadUrl } = data.data ?? {};
      if (!downloadUrl) {
        toast.error('URL unduhan tidak tersedia');
        return;
      }
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setDownloading(false);
    }
  };

  if (pdfStatus === PDFStatus.NOT_GENERATED) {
    return null;
  }

  if (pdfStatus === PDFStatus.FAILED) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-red-500 ${className}`}>
        <AlertCircle className="h-3.5 w-3.5" />
        PDF gagal dibuat
      </div>
    );
  }

  if (pdfStatus === PDFStatus.PENDING || pdfStatus === PDFStatus.RENDERING) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ${className}`}>
        <Clock className="h-3.5 w-3.5 animate-pulse text-sky-500" />
        PDF sedang diproses...
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50 ${className}`}
    >
      {downloading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      Unduh PDF
    </button>
  );
}

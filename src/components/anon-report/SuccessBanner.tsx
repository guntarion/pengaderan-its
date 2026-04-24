/**
 * src/components/anon-report/SuccessBanner.tsx
 * NAWASENA M12 — Success page with tracking code display and copy button.
 *
 * Follows copy-to-clipboard guide: icon-only button, toast feedback in Indonesian.
 */

'use client';

import { CheckCircle2, Copy, Check, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from '@/lib/toast';

interface SuccessBannerProps {
  trackingCode: string;
}

export function SuccessBanner({ trackingCode }: SuccessBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      toast.success('Kode laporan tersalin!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = trackingCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      toast.success('Kode laporan tersalin!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/40">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Laporan Terkirim
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Laporan Anda telah diterima secara anonim dan akan ditinjau oleh petugas.
          </p>
        </div>
      </div>

      {/* Tracking code display */}
      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-6 dark:border-sky-900 dark:bg-sky-950/30">
        <p className="mb-3 text-center text-sm font-semibold text-sky-700 dark:text-sky-300">
          Kode Penelusuran Laporan Anda
        </p>

        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-3xl font-bold tracking-widest text-sky-800 dark:text-sky-200">
            {trackingCode}
          </span>
          <button
            onClick={handleCopy}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-white text-gray-300 transition-colors hover:border-sky-400 hover:text-sky-600 dark:border-sky-700 dark:bg-sky-900/30 dark:text-gray-500 dark:hover:text-sky-400"
            title="Salin kode"
            aria-label="Salin kode laporan"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-sky-600 dark:text-sky-400">
          Simpan kode ini. Anda akan membutuhkannya untuk melihat status laporan.
          Kode ini tidak dapat dipulihkan jika hilang.
        </p>
      </div>

      {/* Warning */}
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          Penting: Simpan kode laporan di tempat yang aman
        </p>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
          Karena sistem ini sepenuhnya anonim, kami tidak dapat membantu Anda menemukan kembali
          kode ini jika hilang. Tulis di tempat yang hanya Anda ketahui.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/anon-status/${trackingCode}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-600"
        >
          Lihat Status Laporan
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/"
          className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

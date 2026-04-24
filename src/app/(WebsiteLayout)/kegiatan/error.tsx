/**
 * src/app/(WebsiteLayout)/kegiatan/error.tsx
 * Error boundary for the kegiatan catalog page.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function KegiatanCatalogError({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-900 p-8 max-w-md w-full text-center shadow-md">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
          Gagal Memuat Katalog
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Terjadi kesalahan saat memuat data kegiatan.
          {error.digest && (
            <span className="block text-xs text-gray-400 mt-1">ID: {error.digest}</span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="px-4 py-2 border border-sky-200 dark:border-sky-700 text-sky-600 dark:text-sky-400 rounded-xl text-sm font-medium hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
          >
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

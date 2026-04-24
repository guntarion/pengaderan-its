/**
 * src/app/(WebsiteLayout)/kegiatan/not-found.tsx
 * 404 page for the kegiatan section.
 */

import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function KegiatanNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-8 max-w-md w-full text-center shadow-md">
        <BookOpen className="h-12 w-12 text-sky-300 dark:text-sky-700 mx-auto mb-4" />
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
          Kegiatan Tidak Ditemukan
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Kegiatan yang Anda cari tidak tersedia atau sudah tidak aktif.
        </p>
        <Link
          href="/kegiatan"
          className="inline-block px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Kembali ke Katalog
        </Link>
      </div>
    </div>
  );
}

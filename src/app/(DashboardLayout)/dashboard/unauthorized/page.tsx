'use client';

/**
 * src/app/(DashboardLayout)/dashboard/unauthorized/page.tsx
 * M13 — 403 Unauthorized friendly page for cross-role dashboard access attempts.
 */

import Link from 'next/link';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm p-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl">
            <ShieldX className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Akses Ditolak
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Kamu tidak memiliki akses ke halaman ini. Dashboard ini hanya dapat diakses
          oleh role yang sesuai.
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-400 text-sm font-medium rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
          >
            <Home className="h-4 w-4" />
            Dashboard Saya
          </Link>
        </div>
      </div>
    </div>
  );
}

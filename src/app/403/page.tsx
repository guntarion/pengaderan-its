/**
 * src/app/403/page.tsx
 * Forbidden (403) page shown when user lacks RBAC access to a route.
 */

'use client';

import Link from 'next/link';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-8 max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Akses Ditolak
        </h1>

        {/* Code */}
        <p className="text-6xl font-black text-red-200 dark:text-red-900/50 mb-4 leading-none">
          403
        </p>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Anda tidak memiliki izin untuk mengakses halaman ini.
          Jika Anda merasa ini adalah kesalahan, hubungi SC atau Administrator.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>

          <Link href="/dashboard">
            <Button className="gap-2 bg-sky-500 hover:bg-sky-600 text-white w-full sm:w-auto">
              <Home className="w-4 h-4" />
              Ke Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

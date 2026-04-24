/**
 * src/app/(WebsiteLayout)/anon-status/[code]/page.tsx
 * NAWASENA M12 — Public status detail page (server component).
 *
 * Fetches allowlisted fields from API. No sensitive data exposed.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StatusTrackerCard } from '@/components/anon-report/StatusTrackerCard';
import { AnonStatus, AnonSeverity, AnonCategory } from '@prisma/client';

interface StatusPageProps {
  params: Promise<{ code: string }>;
}

export const metadata: Metadata = {
  title: 'Status Laporan — NAWASENA',
  robots: { index: false, follow: false },
};

interface StatusData {
  status: AnonStatus;
  category: AnonCategory;
  severity: AnonSeverity;
  acknowledgedAt: Date | null;
  recordedAt: Date;
  publicNote: string | null;
  closedAt: Date | null;
}

async function fetchStatus(code: string): Promise<StatusData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/anon-reports/status/${code}`, {
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success) return null;

    return data.data;
  } catch {
    return null;
  }
}

export default async function AnonStatusDetailPage({ params }: StatusPageProps) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();

  if (!/^NW-[A-Z0-9]{8}$/.test(normalizedCode)) {
    redirect('/anon-status');
  }

  const statusData = await fetchStatus(normalizedCode);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-blue-50 to-sky-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="mx-auto max-w-xl px-4 py-8">
        {/* Back */}
        <Link
          href="/anon-status"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Cek kode lain
        </Link>

        {statusData ? (
          <StatusTrackerCard data={statusData} trackingCode={normalizedCode} />
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Kode tidak ditemukan atau tidak valid.
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Pastikan kode yang Anda masukkan sudah benar. Format: NW-XXXXXXXX
            </p>
            <Link
              href="/anon-status"
              className="mt-4 inline-block text-sm text-sky-600 hover:underline dark:text-sky-400"
            >
              Coba lagi
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

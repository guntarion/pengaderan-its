/**
 * src/app/(WebsiteLayout)/anon-report/success/page.tsx
 * NAWASENA M12 — Success page after anonymous report submission.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SuccessBanner } from '@/components/anon-report/SuccessBanner';

export const metadata: Metadata = {
  title: 'Laporan Terkirim — NAWASENA',
  robots: { index: false, follow: false },
};

interface SuccessPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function AnonReportSuccessPage({ searchParams }: SuccessPageProps) {
  const { code } = await searchParams;

  // Validate tracking code format
  if (!code || !/^NW-[A-Z0-9]{8}$/.test(code)) {
    redirect('/anon-report');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-blue-50 to-sky-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-2xl border border-sky-100 bg-white p-6 dark:border-sky-900 dark:bg-gray-900">
          <SuccessBanner trackingCode={code} />
        </div>
      </div>
    </div>
  );
}

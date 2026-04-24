'use client';

/**
 * src/app/(DashboardLayout)/dashboard/mental-health/consent/ConsentPageClient.tsx
 * NAWASENA M11 — Client shell for the consent page.
 *
 * Handles redirect logic after accept/decline.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ConsentScreen } from '@/components/mental-health/ConsentScreen';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { Heart } from 'lucide-react';

interface ConsentPageClientProps {
  consentMarkdown: string;
  consentVersion: string;
}

export default function ConsentPageClient({ consentMarkdown, consentVersion }: ConsentPageClientProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const cohortId =
    (session?.user as { currentCohortId?: string })?.currentCohortId ?? '';

  function handleAccepted() {
    router.push('/dashboard/mental-health/form');
  }

  function handleDeclined() {
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-sky-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-sky-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold">Skrining Kesehatan Mental</h1>
          </div>
          <p className="text-sm text-white/80 mt-1">
            Sebelum memulai, bacalah persetujuan penggunaan data di bawah ini dengan saksama.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto max-w-3xl px-4 pt-4">
        <DynamicBreadcrumb
          labels={{
            'mental-health': 'Kesehatan Mental',
            consent: 'Persetujuan',
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
            Persetujuan Penggunaan Data Kesehatan Mental
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Versi {consentVersion} · Skrining PHQ-9 Bahasa Indonesia
          </p>

          {cohortId ? (
            <ConsentScreen
              consentMarkdown={consentMarkdown}
              cohortId={cohortId}
              consentVersion={consentVersion}
              onAccepted={handleAccepted}
              onDeclined={handleDeclined}
            />
          ) : (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
              <p>Kamu belum terdaftar dalam kohort aktif.</p>
              <p className="mt-1">Hubungi admin NAWASENA untuk informasi lebih lanjut.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

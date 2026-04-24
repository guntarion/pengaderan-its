'use client';

/**
 * src/app/(DashboardLayout)/dashboard/mental-health/privacy/page.tsx
 * NAWASENA M11 — Privacy controls page for MH data.
 *
 * Shows the Maba's active/withdrawn consents.
 * Allows withdrawal of consent per cohort.
 * Links to data deletion request.
 *
 * No PII beyond consent status and dates — no scores, no answers.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { PrivacyControls } from '@/components/mental-health/PrivacyControls';
import { SkeletonCard } from '@/components/shared/skeletons';
import { Shield } from 'lucide-react';

interface ConsentInfo {
  id: string;
  status: 'GRANTED' | 'WITHDRAWN' | 'EXPIRED_VERSION';
  cohortId: string;
  cohortName?: string;
  consentVersion: string;
  grantedAt: string;
}

interface ConsentsApiResponse {
  success: boolean;
  data: ConsentInfo[];
}

export default function PrivacyPage() {
  const [consents, setConsents] = useState<ConsentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchConsents() {
      try {
        const res = await fetch('/api/mental-health/consent/list');
        if (res.ok) {
          const json = (await res.json()) as ConsentsApiResponse;
          setConsents(json.data ?? []);
        }
      } catch {
        // silently fail — PrivacyControls handles empty state
      } finally {
        setIsLoading(false);
      }
    }
    fetchConsents();
  }, []);

  function handleConsentWithdrawn(cohortId: string) {
    setConsents((prev) =>
      prev.map((c) => (c.cohortId === cohortId ? { ...c, status: 'WITHDRAWN' } : c)),
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-sky-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-sky-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/mental-health" className="text-white/80 hover:text-white text-sm">
              &larr;
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <h1 className="text-xl font-bold">Privasi &amp; Kontrol Data</h1>
            </div>
          </div>
          <p className="text-sm text-white/80">
            Kelola persetujuan dan data skrining kesehatan mental kamu di sini.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto max-w-3xl px-4 pt-4">
        <DynamicBreadcrumb
          labels={{
            'mental-health': 'Kesehatan Mental',
            privacy: 'Privasi',
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-6 flex flex-col gap-6">
        {/* Info banner */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Hak kamu:</strong> Sesuai UU PDP No. 27 Tahun 2022, kamu berhak mengakses,
            mencabut persetujuan, dan meminta penghapusan data kapan saja. Pencabutan tidak
            mempengaruhi keikutsertaan kamu dalam kegiatan NAWASENA lainnya.
          </p>
        </div>

        {/* Consent list */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
            Status Persetujuan
          </h2>
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <PrivacyControls
              consents={consents}
              onConsentWithdrawn={handleConsentWithdrawn}
            />
          )}
        </div>

        {/* Audit info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 rounded-2xl">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Tentang Log Akses
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Setiap akses ke data skrining kamu dicatat dalam log audit yang tidak dapat diubah.
            Log ini disimpan selama 10 tahun sesuai ketentuan hukum. Untuk melihat siapa yang
            pernah mengakses data kamu, hubungi SAC HMTC.
          </p>
        </div>
      </div>
    </div>
  );
}

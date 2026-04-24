'use client';

/**
 * src/app/(DashboardLayout)/dashboard/mental-health/form/page.tsx
 * NAWASENA M11 — Screening form page.
 *
 * Flow:
 *   1. Check consent status.
 *   2. If not consented → redirect to /consent.
 *   3. Show PHQ9Form.
 *   4. On complete → show ScreeningResult inline.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PHQ9Form } from '@/components/mental-health/PHQ9Form';
import { ScreeningResult } from '@/components/mental-health/ScreeningResult';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { Heart } from 'lucide-react';
import Link from 'next/link';

interface ConsentRecord {
  id: string;
  status: string;
  cohortId: string;
}

interface ScreeningResultData {
  screeningId: string;
  severity: 'GREEN' | 'YELLOW' | 'RED';
  flagged: boolean;
  immediateContact: boolean;
  interpretationKey: string;
  instrument: string;
  phase: string;
}

export default function MHFormPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [consentRecord, setConsentRecord] = useState<ConsentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ScreeningResultData | null>(null);

  const cohortId = (session?.user as { currentCohortId?: string })?.currentCohortId ?? '';

  useEffect(() => {
    if (!cohortId) return;

    async function checkConsent() {
      try {
        const res = await fetch('/api/mental-health/consent/list');
        if (res.ok) {
          const json = (await res.json()) as { success: boolean; data: ConsentRecord[] };
          const active = json.data.find(
            (c) => c.cohortId === cohortId && c.status === 'GRANTED',
          );
          if (!active) {
            router.push('/dashboard/mental-health/consent');
            return;
          }
          setConsentRecord(active);
        }
      } catch {
        // fallback — show form with placeholder consentId
      } finally {
        setIsLoading(false);
      }
    }

    checkConsent();
  }, [cohortId, router]);

  if (isLoading || !cohortId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-sky-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950">
        <div className="bg-gradient-to-r from-teal-600 to-sky-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <h1 className="text-xl font-bold">Skrining Kesehatan Mental</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-sky-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-sky-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="text-white/80 hover:text-white text-sm">&larr;</Link>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              <h1 className="text-xl font-bold">Skrining Kesehatan Mental</h1>
            </div>
          </div>
          <p className="text-sm text-white/80">
            {result ? 'Skrining selesai' : 'Kuesioner PHQ-9 (±5 menit)'}
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto max-w-3xl px-4 pt-4">
        <DynamicBreadcrumb
          labels={{
            'mental-health': 'Kesehatan Mental',
            form: 'Form Skrining',
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          {result ? (
            <>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
                Hasil Skrining
              </h2>
              <ScreeningResult
                severity={result.severity}
                flagged={result.flagged}
                immediateContact={result.immediateContact}
                interpretationKey={result.interpretationKey}
                instrument={result.instrument}
                phase={result.phase}
              />
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                Kuesioner Kesehatan Mental
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Tidak ada jawaban benar atau salah. Jawab sesuai perasaanmu 2 minggu terakhir.
              </p>
              {consentRecord && (
                <PHQ9Form
                  cohortId={cohortId}
                  consentId={consentRecord.id}
                  phase="F1"
                  onComplete={setResult}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

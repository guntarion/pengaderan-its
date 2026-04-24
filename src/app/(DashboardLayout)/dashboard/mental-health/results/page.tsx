'use client';

/**
 * src/app/(DashboardLayout)/dashboard/mental-health/results/page.tsx
 * NAWASENA M11 — Own screening history (no scores, no answers).
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { Heart, ChevronRight } from 'lucide-react';

interface ScreeningMeta {
  id: string;
  instrument: string;
  phase: string;
  severity: 'GREEN' | 'YELLOW' | 'RED';
  flagged: boolean;
  immediateContact: boolean;
  recordedAt: string;
}

const PHASE_LABELS: Record<string, string> = {
  F1: 'Awal Angkatan',
  F4: 'Akhir Angkatan',
  SELF_TRIGGERED: 'Mandiri',
};

const SEVERITY_LABELS: Record<string, string> = {
  GREEN: 'Kondisi Stabil',
  YELLOW: 'Perlu Perhatian',
  RED: 'Dukungan Segera',
};

const SEVERITY_BADGE: Record<string, string> = {
  GREEN: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  YELLOW: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  RED: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

export default function ResultsPage() {
  const [screenings, setScreenings] = useState<ScreeningMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchScreenings() {
      try {
        const res = await fetch('/api/mental-health/submissions');
        if (res.ok) {
          const json = (await res.json()) as { success: boolean; data: ScreeningMeta[] };
          setScreenings(json.data ?? []);
        }
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchScreenings();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-sky-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-sky-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/mental-health" className="text-white/80 hover:text-white text-sm">&larr;</Link>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              <h1 className="text-xl font-bold">Riwayat Skrining</h1>
            </div>
          </div>
          <p className="text-sm text-white/80">
            Catatan skrining kesehatan mentalmu. Data kamu terenkripsi dan aman.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto max-w-3xl px-4 pt-4">
        <DynamicBreadcrumb
          labels={{
            'mental-health': 'Kesehatan Mental',
            results: 'Riwayat',
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-6">
        {isLoading ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            <SkeletonCard />
          </div>
        ) : screenings.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada skrining</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">
              Mulai skrining pertamamu untuk melihat riwayat di sini.
            </p>
            <Link
              href="/dashboard/mental-health/form"
              className="inline-block px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              Mulai Skrining
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {screenings.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/mental-health/results/${s.id}`}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex items-center gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SEVERITY_BADGE[s.severity]}`}>
                      {SEVERITY_LABELS[s.severity]}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {PHASE_LABELS[s.phase] ?? s.phase}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {s.instrument} ·{' '}
                    {new Date(s.recordedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

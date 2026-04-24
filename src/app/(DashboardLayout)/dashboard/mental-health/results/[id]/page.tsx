'use client';

/**
 * src/app/(DashboardLayout)/dashboard/mental-health/results/[id]/page.tsx
 * NAWASENA M11 — Own screening detail page (no scores, no answers).
 *
 * Shows severity label, phase, instrument, date.
 * NEVER shows raw score or individual answers.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { EmergencyBanner } from '@/components/mental-health/EmergencyBanner';
import { Heart, ArrowLeft } from 'lucide-react';

interface ScreeningDetail {
  id: string;
  instrument: string;
  phase: string;
  severity: 'GREEN' | 'YELLOW' | 'RED';
  flagged: boolean;
  immediateContact: boolean;
  recordedAt: string;
  cohortId: string;
}

const PHASE_LABELS: Record<string, string> = {
  F1: 'Awal Angkatan (F1)',
  F4: 'Akhir Angkatan (F4)',
  SELF_TRIGGERED: 'Skrining Mandiri',
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

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [screening, setScreening] = useState<ScreeningDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchDetail() {
      try {
        const res = await fetch(`/api/mental-health/submissions/${id}`);
        if (!res.ok) {
          const json = (await res.json()) as { error?: { message: string } };
          setError(json.error?.message ?? 'Tidak dapat memuat data skrining');
          return;
        }
        const json = (await res.json()) as { success: boolean; data: ScreeningDetail };
        setScreening(json.data);
      } catch {
        setError('Gagal terhubung ke server');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetail();
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-sky-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-sky-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/mental-health/results" className="text-white/80 hover:text-white text-sm">&larr;</Link>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              <h1 className="text-xl font-bold">Detail Skrining</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto max-w-3xl px-4 pt-4">
        <DynamicBreadcrumb
          labels={{
            'mental-health': 'Kesehatan Mental',
            results: 'Riwayat',
            [id]: 'Detail',
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-6">
        {isLoading ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            <SkeletonCard />
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Link
              href="/dashboard/mental-health/results"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Riwayat
            </Link>
          </div>
        ) : screening ? (
          <div className="flex flex-col gap-5">
            {/* Emergency banner */}
            <EmergencyBanner visible={screening.immediateContact} />

            {/* Detail card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                  Hasil Skrining
                </h2>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${SEVERITY_BADGE[screening.severity]}`}>
                  {SEVERITY_LABELS[screening.severity]}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Instrumen</dt>
                  <dd className="font-medium text-gray-700 dark:text-gray-300">{screening.instrument}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Fase</dt>
                  <dd className="font-medium text-gray-700 dark:text-gray-300">{PHASE_LABELS[screening.phase] ?? screening.phase}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Tanggal</dt>
                  <dd className="font-medium text-gray-700 dark:text-gray-300">
                    {new Date(screening.recordedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Dukungan Segera</dt>
                  <dd className="font-medium text-gray-700 dark:text-gray-300">
                    {screening.immediateContact ? 'Ya — Konselor dihubungi' : 'Tidak'}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4">
                Data skrining kamu terenkripsi. Skor angka tidak ditampilkan untuk menjaga privasi dan mencegah stigma mandiri.
              </p>
            </div>

            <Link
              href="/dashboard/mental-health/results"
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Riwayat
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

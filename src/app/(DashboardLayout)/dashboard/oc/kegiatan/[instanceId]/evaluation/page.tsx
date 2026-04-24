'use client';

/**
 * src/app/(DashboardLayout)/dashboard/oc/kegiatan/[instanceId]/evaluation/page.tsx
 * NAWASENA M08 — Post-event evaluation page.
 *
 * - Disabled if instance status != DONE
 * - Read-only if already submitted
 * - Shows prefill data + override toggles
 */

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { EvaluationForm } from '@/components/event-execution/EvaluationForm';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { ChevronLeftIcon, ClipboardListIcon, AlertCircleIcon } from 'lucide-react';

interface EvaluationPrefill {
  instanceId: string;
  instanceStatus: string;
  kegiatanNama: string;
  attendancePct: number | null;
  confirmedCount: number;
  hadirCount: number;
  npsScore: number | null;
  npsResponseCount: number;
  redFlagsCount: number | null;
  redFlagsSource: string;
  existingEvaluation: {
    id: string;
    attendancePct: number | null;
    attendancePctOverride: number | null;
    npsScore: number | null;
    npsScoreOverride: number | null;
    scoreL2agg: number | null;
    notes: string | null;
    filledAt: string;
    submittedLate: boolean;
  } | null;
}

export default function EvaluationPage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const { instanceId } = use(params);
  const [prefill, setPrefill] = useState<EvaluationPrefill | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrefill = useCallback(async () => {
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/evaluation`);
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      setPrefill(data.data);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchPrefill();
  }, [fetchPrefill]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-2xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            className="text-white/70 mb-3 text-sm"
          />
          <Link
            href={`/dashboard/oc/kegiatan/${instanceId}`}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            {prefill?.kegiatanNama ?? 'Detail Kegiatan'}
          </Link>
          <div className="flex items-center gap-3">
            <ClipboardListIcon className="h-6 w-6" />
            <h1 className="text-xl font-bold">Evaluasi Kegiatan</h1>
          </div>
          <p className="text-sm text-white/80 mt-1">
            {prefill?.kegiatanNama ?? ''} — {prefill?.instanceStatus}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-6 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : !prefill ? (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
              Gagal memuat data evaluasi.
            </div>
          ) : prefill.instanceStatus !== 'DONE' ? (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-4">
              <AlertCircleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Evaluasi belum tersedia
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Evaluasi hanya bisa diisi setelah kegiatan selesai (status DONE).
                  Status saat ini: <strong>{prefill.instanceStatus}</strong>.
                </p>
              </div>
            </div>
          ) : (
            <EvaluationForm instanceId={instanceId} prefill={prefill} />
          )}
        </div>
      </div>
    </div>
  );
}

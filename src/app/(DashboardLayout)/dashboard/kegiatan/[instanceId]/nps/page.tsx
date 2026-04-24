'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kegiatan/[instanceId]/nps/page.tsx
 * NAWASENA M06 — NPS Form Page for Maba.
 *
 * Guards: must be HADIR, instance DONE, within 7-day window, no duplicate.
 * If already submitted → shows NPSAlreadySubmittedView.
 * If not eligible → shows reason + back link.
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, LockIcon } from 'lucide-react';
import { NPSForm } from '@/components/event/NPSForm';
import { NPSAlreadySubmittedView } from '@/components/event/NPSAlreadySubmittedView';
import { SkeletonForm, SkeletonPageHeader } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';

interface NPSState {
  canSubmit: boolean;
  reason?: string;
  alreadySubmitted: boolean;
  submission: {
    npsScore: number;
    feltSafe: number;
    meaningful: number;
    recordedAt: string;
  } | null;
}

export default function NPSPage({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = use(params);
  const [state, setState] = useState<NPSState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchState() {
      setLoading(true);
      try {
        const res = await fetch(`/api/event/nps/${instanceId}/me`);
        const data = await res.json();

        if (!res.ok) {
          toast.apiError(data);
          return;
        }

        setState(data.data);
      } catch (err) {
        toast.apiError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchState();
  }, [instanceId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link
            href={`/dashboard/kegiatan/${instanceId}`}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Kembali ke detail kegiatan
          </Link>
          <h1 className="text-xl font-bold">Formulir Feedback (NPS)</h1>
          <p className="text-sm text-white/80 mt-1">Bantu kami tingkatkan kualitas kegiatan</p>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-3xl px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            <SkeletonPageHeader />
            <SkeletonForm fields={4} />
          </div>
        ) : !state ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Gagal memuat data.</p>
          </div>
        ) : state.alreadySubmitted && state.submission ? (
          <NPSAlreadySubmittedView submission={state.submission} instanceId={instanceId} />
        ) : !state.canSubmit ? (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-center">
              <LockIcon className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Formulir Tidak Tersedia
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {state.reason ?? 'Kamu belum memenuhi syarat untuk mengisi formulir ini.'}
              </p>
            </div>
            <Link
              href={`/dashboard/kegiatan/${instanceId}`}
              className="block text-center text-sm text-sky-600 dark:text-sky-400 hover:underline"
            >
              Kembali ke detail kegiatan
            </Link>
          </div>
        ) : (
          <NPSForm instanceId={instanceId} />
        )}
      </div>
    </div>
  );
}

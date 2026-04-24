'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kp/peer-debriefs/[kpUserId]/page.tsx
 * NAWASENA M09 — KP Peer Debrief detail page (read-only).
 *
 * Shows one peer's weekly debrief. Strictly read-only — no input fields.
 * Cross-cohort access blocked by API (ForbiddenError).
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonText } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import Link from 'next/link';
import { ChevronLeft, NotebookText } from 'lucide-react';

const log = createLogger('kp-peer-debrief-detail-page');

interface PeerDebriefDetail {
  peer: {
    id: string;
    name: string;
    image: string | null;
  };
  debrief: {
    id: string;
    whatWorked: string;
    whatDidnt: string;
    changesNeeded: string;
    weekNumber: number;
    yearNumber: number;
    submittedAt: string;
  };
  weekNumber: number;
  yearNumber: number;
}

export default function PeerDebriefDetailPage() {
  const params = useParams<{ kpUserId: string }>();
  const [data, setData] = useState<PeerDebriefDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDebrief() {
      try {
        log.info('Fetching peer debrief detail', { kpUserId: params.kpUserId });
        const res = await fetch(`/api/kp/peer-debriefs/${params.kpUserId}`);
        if (!res.ok) {
          const json = await res.json();
          if (res.status === 403) {
            setError('Tidak dapat mengakses debrief peer dari cohort lain.');
          } else if (res.status === 404) {
            setError('Debrief peer tidak ditemukan untuk minggu ini.');
          } else {
            toast.apiError(json);
            setError('Gagal memuat debrief.');
          }
          return;
        }
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        log.error('Failed to fetch peer debrief detail', { err });
        setError('Gagal memuat debrief.');
      } finally {
        setLoading(false);
      }
    }
    fetchDebrief();
  }, [params.kpUserId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <DynamicBreadcrumb />
            <h1 className="text-xl font-bold mt-2">Peer Debrief</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <SkeletonText lines={6} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-gray-500 mb-4">{error ?? 'Debrief tidak ditemukan.'}</p>
          <Link
            href="/dashboard/kp/peer-debriefs"
            className="text-sm text-sky-600 hover:underline"
          >
            Kembali ke daftar
          </Link>
        </div>
      </div>
    );
  }

  const peerInitial = data.peer.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            labels={{ [params.kpUserId]: data.peer.name }}
            homeLabel="Dashboard"
            homeHref="/dashboard"
          />
          <div className="flex items-center gap-3 mt-2">
            <Link
              href="/dashboard/kp/peer-debriefs"
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="p-2 bg-white/20 rounded-xl">
              <NotebookText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Debrief {data.peer.name}</h1>
              <p className="text-sm text-white/80">
                Minggu ke-{data.weekNumber}, {data.yearNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Peer info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {peerInitial}
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-white">{data.peer.name}</p>
              <p className="text-xs text-gray-400">
                Dikirim{' '}
                {new Date(data.debrief.submittedAt).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Debrief content — read-only, no input fields */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5 space-y-6">
          <DebriefsSection
            title="Yang Berjalan Baik"
            content={data.debrief.whatWorked}
            borderColor="border-emerald-200 dark:border-emerald-800"
          />
          <DebriefsSection
            title="Yang Tidak Berjalan"
            content={data.debrief.whatDidnt}
            borderColor="border-amber-200 dark:border-amber-800"
          />
          <DebriefsSection
            title="Perubahan yang Diperlukan"
            content={data.debrief.changesNeeded}
            borderColor="border-sky-200 dark:border-sky-800"
          />
        </div>

        {/* Read-only notice */}
        <p className="text-xs text-center text-gray-400">
          Debrief ini bersifat read-only. Hanya KP dalam cohort yang sama yang dapat membacanya.
        </p>

        <div className="pt-2">
          <Link
            href="/dashboard/kp/peer-debriefs"
            className="flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400 hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            Kembali ke daftar peer debriefs
          </Link>
        </div>
      </div>
    </div>
  );
}

function DebriefsSection({
  title,
  content,
  borderColor,
}: {
  title: string;
  content: string;
  borderColor: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <p className={`text-sm text-gray-700 dark:text-gray-300 border-l-2 ${borderColor} pl-3 whitespace-pre-line`}>
        {content}
      </p>
    </div>
  );
}

'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kp/peer-debriefs/page.tsx
 * NAWASENA M09 — KP Peer Debrief list page.
 *
 * Shows peers in the same cohort who have submitted debriefs this week.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCardGrid } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { ChevronRight, Users, MessageSquare } from 'lucide-react';

const log = createLogger('kp-peer-debriefs-page');

interface PeerDebriefWithName {
  kpUserId: string;
  debriefId: string;
  submittedAt: string;
  preview: string;
}

export default function KPPeerDebriefsPage() {
  const [peers, setPeers] = useState<PeerDebriefWithName[]>([]);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [yearNumber, setYearNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPeers() {
      try {
        log.info('Fetching peer debriefs list');
        const res = await fetch('/api/kp/peer-debriefs');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setPeers(json.data?.peers ?? []);
        setWeekNumber(json.data?.weekNumber ?? null);
        setYearNumber(json.data?.yearNumber ?? null);
      } catch (err) {
        log.error('Failed to fetch peer debriefs', { err });
        toast.error('Gagal memuat daftar peer debrief');
      } finally {
        setLoading(false);
      }
    }
    fetchPeers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <DynamicBreadcrumb />
            <h1 className="text-xl font-bold mt-2">Peer Debriefs</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <SkeletonCardGrid count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Peer Debriefs</h1>
              <p className="text-sm text-white/80">
                {weekNumber && yearNumber
                  ? `Minggu ke-${weekNumber}, ${yearNumber}`
                  : 'Debrief mingguan teman KP cohortmu'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Info box */}
        <div className="p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl text-sm text-sky-700 dark:text-sky-400">
          Debrief yang terlihat di sini hanya dari sesama KP dalam satu cohortmu. Baca sebagai
          bahan refleksi dan saling mendukung.
        </div>

        {peers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-12 text-center shadow-sm">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Belum ada peer debrief
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Teman KPmu belum mengisi debrief minggu ini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {peers.map((peer) => (
              <Link
                key={peer.kpUserId}
                href={`/dashboard/kp/peer-debriefs/${peer.kpUserId}`}
                className="block bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm hover:shadow-md hover:border-sky-200 dark:hover:border-sky-700 transition-all p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    K
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">
                        KP {peer.kpUserId.substring(0, 8)}...
                      </p>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(peer.submittedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    {peer.preview && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {peer.preview}...
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kp/mood/page.tsx
 * NAWASENA M04 — KP Mood Dashboard.
 * Auto-refreshes every 60 seconds. Shows aggregate, distribution, not-checked-in, red flags.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { MoodAggregateCard } from '@/components/kp-mood/MoodAggregateCard';
import { MoodDistributionChart } from '@/components/kp-mood/MoodDistributionChart';
import { NotCheckedInList } from '@/components/kp-mood/NotCheckedInList';
import { RedFlagPanel } from '@/components/kp-mood/RedFlagPanel';
import { FollowUpModal } from '@/components/kp-mood/FollowUpModal';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';

interface MoodAggregate {
  avgMood: number | null;
  distribution: Record<string, number>;
  totalSubmitted: number;
  totalMembers: number;
  generatedAt: string;
}

interface Member {
  id: string;
  fullName: string;
  displayName: string | null;
}

interface RedFlagEvent {
  id: string;
  subjectUserId: string;
  subject: { id: string; fullName: string; displayName: string | null };
  triggeredAt: string;
  status: string;
  pulseSnapshot: Array<{ mood: number }>;
}

interface MoodApiResponse {
  aggregate: MoodAggregate | null;
  notCheckedIn: Member[];
  currentHour: number;
  timezone?: string;
}

interface KpGroupInfo {
  cohortId: string;
  kpGroupId: string;
}

function minutesAgo(isoString: string): string {
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (mins < 1) return 'baru saja';
  if (mins === 1) return '1 menit lalu';
  return `${mins} menit lalu`;
}

export default function KpMoodPage() {
  const [moodData, setMoodData] = useState<MoodApiResponse | null>(null);
  const [redFlags, setRedFlags] = useState<RedFlagEvent[]>([]);
  const [kpGroupInfo, setKpGroupInfo] = useState<KpGroupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [activeFollowUpEventId, setActiveFollowUpEventId] = useState<string | null>(null);

  // First fetch KP group info from session/profile
  const fetchKpGroupInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/kp/group-info');
      if (!res.ok) return null;
      const data = await res.json();
      return data.data as KpGroupInfo;
    } catch {
      return null;
    }
  }, []);

  const fetchMoodData = useCallback(async (info: KpGroupInfo) => {
    try {
      const params = new URLSearchParams({
        cohortId: info.cohortId,
        kpGroupId: info.kpGroupId,
      });
      const res = await fetch(`/api/kp/mood?${params}`);
      if (!res.ok) {
        toast.error('Gagal memuat data mood');
        return;
      }
      const json = await res.json();
      setMoodData(json.data);
      setLastFetched(new Date());
    } catch {
      toast.error('Gagal terhubung ke server');
    }
  }, []);

  const fetchRedFlags = useCallback(async (info: KpGroupInfo) => {
    try {
      const params = new URLSearchParams({ cohortId: info.cohortId, status: 'ACTIVE' });
      const res = await fetch(`/api/kp/red-flag?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setRedFlags(json.data ?? []);
    } catch {
      // Non-fatal — red flags remain empty
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      let info = kpGroupInfo;
      if (!info) {
        info = await fetchKpGroupInfo();
        if (info) setKpGroupInfo(info);
      }
      if (info) {
        await Promise.all([fetchMoodData(info), fetchRedFlags(info)]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [kpGroupInfo, fetchKpGroupInfo, fetchMoodData, fetchRedFlags]);

  // Initial load
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      if (kpGroupInfo) {
        fetchMoodData(kpGroupInfo);
        fetchRedFlags(kpGroupInfo);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [kpGroupInfo, fetchMoodData, fetchRedFlags]);

  const handleManualRefresh = () => {
    loadAll();
  };

  const handleFollowUpSubmitted = () => {
    setActiveFollowUpEventId(null);
    if (kpGroupInfo) {
      fetchRedFlags(kpGroupInfo);
    }
  };

  // Build red flag events for panel
  const redFlagEvents = redFlags.map((ev) => {
    const moods = (ev.pulseSnapshot ?? []).map((p) => p.mood);
    const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
    return {
      id: ev.id,
      userId: ev.subjectUserId,
      userName: ev.subject?.displayName ?? ev.subject?.fullName ?? 'Unknown',
      triggeredAt: ev.triggeredAt,
      status: ev.status,
      avgMood,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Mood Kelompok</h1>
              <p className="text-sm text-white/80 mt-0.5">
                Pantau kondisi emosional Mabamu hari ini
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {lastFetched && (
                <span className="text-xs text-white/70">
                  Updated {minutesAgo(lastFetched.toISOString())}
                </span>
              )}
              <button
                onClick={handleManualRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 bg-transparent border border-white/40 text-white hover:bg-white/10 rounded-xl text-xs px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {isLoading && !moodData ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !moodData ? (
          <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tidak dapat memuat data. Pastikan Anda sudah terdaftar sebagai KP dalam satu KP Group.
            </p>
          </div>
        ) : (
          <>
            <MoodAggregateCard
              avgMood={moodData.aggregate?.avgMood ?? null}
              totalCheckedIn={moodData.aggregate?.totalSubmitted ?? 0}
              groupSize={moodData.aggregate?.totalMembers ?? 0}
              notCheckedInCount={moodData.notCheckedIn.length}
            />

            <MoodDistributionChart
              distribution={moodData.aggregate?.distribution ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }}
            />

            <NotCheckedInList
              members={moodData.notCheckedIn}
              currentHour={moodData.currentHour}
            />

            <RedFlagPanel
              events={redFlagEvents}
              onFollowUp={(eventId) => setActiveFollowUpEventId(eventId)}
            />
          </>
        )}
      </div>

      {/* Follow-up modal */}
      {activeFollowUpEventId && (
        <FollowUpModal
          eventId={activeFollowUpEventId}
          isOpen={true}
          onClose={() => setActiveFollowUpEventId(null)}
          onSubmitted={handleFollowUpSubmitted}
        />
      )}
    </div>
  );
}

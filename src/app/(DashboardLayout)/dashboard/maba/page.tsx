'use client';

/**
 * src/app/(DashboardLayout)/dashboard/maba/page.tsx
 * NAWASENA M13 — MABA Dashboard.
 *
 * Widgets: pulse streak, passport progress ring, upcoming events, mood today, bantuan menu.
 * Pakta gate: redirect to /dashboard/maba/pakta-sign if paktaSigned === false.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { MoodCard } from '@/components/dashboard/widgets/MoodCard';
import { EventListCard } from '@/components/dashboard/widgets/EventListCard';
import { ProgressRing } from '@/components/dashboard/widgets/ProgressRing';
import { WidgetErrorBoundary } from '@/components/dashboard/widgets/WidgetErrorBoundary';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import type { MabaDashboardPayload } from '@/types/dashboard';
import type { UpcomingEvent } from '@/components/dashboard/widgets/EventListCard';
import {
  Flame,
  BookOpen,
  Heart,
  HelpCircle,
  ChevronRight,
  User,
} from 'lucide-react';

const log = createLogger('m13/dashboard/maba');

const BANTUAN_MENU = [
  { href: '/dashboard/mental-health', label: 'Kesehatan Mental', icon: Heart, color: 'text-rose-500' },
  { href: '/dashboard/kakak-c', label: 'Kakak Konselor', icon: User, color: 'text-violet-500' },
  { href: '/dashboard/pulse', label: 'Pulse Check', icon: Flame, color: 'text-orange-500' },
  { href: '/dashboard/journal', label: 'Jurnal Harian', icon: BookOpen, color: 'text-blue-500' },
  { href: '/dashboard/passport', label: 'Passport', icon: HelpCircle, color: 'text-sky-500' },
];

export default function MabaDashboardPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<MabaDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        log.info('Fetching MABA dashboard payload');
        const res = await fetch('/api/dashboard/maba');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        const data: MabaDashboardPayload = json.data;
        setPayload(data);

        // Pakta gate: redirect if not yet signed
        if (!data.paktaSigned) {
          router.replace('/dashboard/maba/pakta-sign');
        }
      } catch (err) {
        log.error('Failed to fetch MABA dashboard', { err });
        toast.error('Gagal memuat dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
            <h1 className="text-xl font-bold mt-2">Dashboard Mahasiswa Baru</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!payload) return null;

  // Map payload to WidgetState shapes
  const moodState = payload.moodToday
    ? { status: 'data' as const, data: payload.moodToday }
    : { status: 'empty' as const };

  const eventsState: { status: 'data'; data: UpcomingEvent[] } | { status: 'empty' } =
    payload.upcomingEvents.length > 0
      ? { status: 'data', data: payload.upcomingEvents as UpcomingEvent[] }
      : { status: 'empty' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dashboard Mahasiswa Baru</h1>
              <p className="text-sm text-white/80">Selamat datang di NAWASENA!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Pulse Streak */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Streak Pulse Check</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {payload.pulseStreak} hari
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/pulse"
              className="flex items-center gap-1 text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700"
            >
              Isi Pulse <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Passport Progress Ring */}
        {payload.passportCompletion !== null && (
          <WidgetErrorBoundary widgetName="Passport Progress">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <ProgressRing
                  percent={payload.passportCompletion}
                  label={`${payload.passportCompletion}%`}
                  sublabel="Passport"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Passport Selesai
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {payload.passportCompletion < 100
                      ? 'Lengkapi passport untuk menyelesaikan program'
                      : 'Semua aktivitas passport selesai!'}
                  </p>
                  <Link
                    href="/dashboard/passport"
                    className="text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1 mt-2"
                  >
                    Lihat Passport <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </WidgetErrorBoundary>
        )}

        {/* Mood Today */}
        <WidgetErrorBoundary widgetName="Mood Hari Ini">
          <MoodCard state={moodState} />
        </WidgetErrorBoundary>

        {/* Upcoming Events */}
        <WidgetErrorBoundary widgetName="Agenda Mendatang">
          <EventListCard state={eventsState} />
        </WidgetErrorBoundary>

        {/* Bantuan & Alat */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Alat &amp; Bantuan
            </h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {BANTUAN_MENU.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

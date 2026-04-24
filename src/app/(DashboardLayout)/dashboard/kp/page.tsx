'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kp/page.tsx
 * NAWASENA M10 + M13 — KP Coordinator dashboard landing page.
 *
 * M13 section: debrief reminder, passport review queue, active red flags count.
 * M10 section: Safe Word quick widget, quick links to KP tools (existing).
 */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SafeWordQuickWidget } from '@/app/(DashboardLayout)/dashboard/kp/components/SafeWordQuickWidget';
import { createLogger } from '@/lib/logger';
import type { KPDashboardPayload } from '@/types/dashboard';
import {
  Users2,
  ClipboardList,
  BarChart2,
  BookOpen,
  MessageSquare,
  ChevronRight,
  AlertTriangle,
  Bell,
  ClipboardCheck,
} from 'lucide-react';

const log = createLogger('m13/dashboard/kp');

const KP_LINKS = [
  {
    href: '/dashboard/kp/group',
    icon: Users2,
    label: 'Grup Saya',
    description: 'Lihat anggota KP group Anda',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
  },
  {
    href: '/dashboard/kp/journal-review',
    icon: ClipboardList,
    label: 'Nilai Jurnal',
    description: 'Review jurnal mingguan anggota',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    href: '/dashboard/kp/mood',
    icon: BarChart2,
    label: 'Mood Kelompok',
    description: 'Pantau mood harian anggota',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
  },
  {
    href: '/dashboard/kp/log/daily',
    icon: BookOpen,
    label: 'Log Daily',
    description: 'Stand-up log KP harian',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    href: '/dashboard/kp/log/weekly',
    icon: BookOpen,
    label: 'Weekly Debrief',
    description: 'Log debrief mingguan KP',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    href: '/dashboard/kp/peer-debriefs',
    icon: MessageSquare,
    label: 'Peer Debriefs',
    description: 'Catatan debrief antar-KP',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
  },
];

export default function KPDashboardPage() {
  const { data: session } = useSession();
  const cohortId = (session?.user as { cohortId?: string })?.cohortId ?? '';
  const [m13Payload, setM13Payload] = useState<KPDashboardPayload | null>(null);

  useEffect(() => {
    async function fetchM13() {
      try {
        const res = await fetch('/api/dashboard/kp');
        if (!res.ok) return;
        const json = await res.json();
        setM13Payload(json.data ?? null);
        log.debug('KP M13 payload loaded', { alertCount: json.data?.activeAlerts?.length });
      } catch (err) {
        log.warn('KP M13 payload fetch failed', { err });
      }
    }
    fetchM13();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />

      {/* Safe Word quick widget — ALWAYS at the very top for KP role */}
      <SafeWordQuickWidget cohortId={cohortId} />

      {/* M13 — Debrief reminder banner */}
      {m13Payload?.debriefReminder && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4 flex items-center gap-3">
          <Bell className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Pengingat Debrief
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              {m13Payload.debriefReminder}
            </p>
          </div>
          <Link
            href="/dashboard/kp/log/weekly"
            className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 shrink-0"
          >
            Buat Log <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* M13 — Quick stats row */}
      {m13Payload && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-xs text-gray-500">Red Flag Aktif</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {m13Payload.activeAlerts.length}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="h-4 w-4 text-sky-500" />
              <p className="text-xs text-gray-500">Passport Review</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {m13Payload.passportReviewQueue}
            </p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Users2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard KP</h1>
          <p className="text-sm text-gray-500">Kelompok Pendamping — Alat &amp; Laporan</p>
        </div>
      </div>

      {/* Quick links grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {KP_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-slate-800 p-5 shadow-sm hover:border-sky-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${link.bg}`}>
                  <Icon className={`h-5 w-5 ${link.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{link.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{link.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-sky-500 transition-colors shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

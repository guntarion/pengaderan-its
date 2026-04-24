'use client';

/**
 * src/app/(DashboardLayout)/dashboard/oc/kegiatan/[instanceId]/attendance/page.tsx
 * NAWASENA M08 — OC Attendance management + QR display.
 *
 * Shows:
 * - Live attendance counter (auto-refresh 30s)
 * - QR display section for PLANNED/RUNNING
 * - Attendance table with manual/bulk controls
 */

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { AttendanceLiveCounter } from '@/components/event-execution/AttendanceLiveCounter';
import { AttendanceTable } from '@/components/event-execution/AttendanceTable';
import { QRDisplay } from '@/components/event-execution/QRDisplay';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { ChevronLeftIcon, QrCodeIcon, UsersIcon } from 'lucide-react';

interface AttendanceRow {
  id: string;
  userId: string;
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA';
  scanMethod: string;
  isWalkin: boolean;
  notes: string | null;
  notedAt: string;
  user: {
    id: string;
    fullName: string;
    displayName: string | null;
    nrp: string | null;
    email: string;
  };
}

interface InstanceInfo {
  id: string;
  status: 'PLANNED' | 'RUNNING' | 'DONE' | 'CANCELLED';
  scheduledAt: string;
  location: string;
  kegiatan: { id: string; nama: string; fase: string };
}

export default function AttendancePage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const { instanceId } = use(params);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [instance, setInstance] = useState<InstanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'attendance' | 'qr'>('attendance');

  const fetchData = useCallback(async () => {
    try {
      const [attRes, detailRes] = await Promise.all([
        fetch(`/api/event-execution/instances/${instanceId}/attendance`),
        fetch(`/api/event/instances/${instanceId}/oc`),
      ]);

      if (attRes.ok) {
        const d = await attRes.json();
        setRows(d.data?.rows ?? []);
      } else {
        toast.apiError(await attRes.json());
      }

      if (detailRes.ok) {
        const d = await detailRes.json();
        setInstance(d.data);
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-4xl">
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
            {instance?.kegiatan.nama ?? 'Detail Kegiatan'}
          </Link>
          <div className="flex items-center gap-3">
            <UsersIcon className="h-6 w-6" />
            <h1 className="text-xl font-bold">Kelola Kehadiran</h1>
          </div>
          <p className="text-sm text-white/80 mt-1">
            {instance?.kegiatan.nama ?? ''} — Fase {instance?.kegiatan.fase ?? ''}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-4xl px-4 py-6 space-y-5">
        {/* Live counter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <AttendanceLiveCounter
            instanceId={instanceId}
            onStatsChange={() => {}}
          />
        </div>

        {/* Section switcher */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('attendance')}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-colors ${
              activeSection === 'attendance'
                ? 'bg-sky-500 text-white border-sky-500'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}
          >
            <UsersIcon className="h-4 w-4" /> Daftar Hadir
          </button>
          {instance && ['PLANNED', 'RUNNING'].includes(instance.status) && (
            <button
              type="button"
              onClick={() => setActiveSection('qr')}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-colors ${
                activeSection === 'qr'
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
              }`}
            >
              <QrCodeIcon className="h-4 w-4" /> QR Code
            </button>
          )}
        </div>

        {/* Attendance table section */}
        {activeSection === 'attendance' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
            {loading ? (
              <SkeletonTable rows={6} columns={4} />
            ) : rows.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data kehadiran.</p>
              </div>
            ) : (
              <AttendanceTable
                instanceId={instanceId}
                rows={rows}
                onRefresh={fetchData}
              />
            )}
          </div>
        )}

        {/* QR section */}
        {activeSection === 'qr' && instance && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
            <QRDisplay
              instanceId={instanceId}
              instanceStatus={instance.status}
            />
          </div>
        )}
      </div>
    </div>
  );
}

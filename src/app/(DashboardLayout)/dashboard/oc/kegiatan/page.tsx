'use client';

/**
 * src/app/(DashboardLayout)/dashboard/oc/kegiatan/page.tsx
 * NAWASENA M06 — OC Kegiatan Hub Page.
 *
 * Lists all instances for OC/SC to manage.
 * Links to per-instance detail (RSVP, Attendance stub, NPS aggregate).
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable, SkeletonPageHeader } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarIcon, ChevronRightIcon, UsersIcon } from 'lucide-react';

interface InstanceSummary {
  id: string;
  title: string;
  status: 'PLANNED' | 'RUNNING' | 'DONE' | 'CANCELLED';
  scheduledAt: string;
  location: string | null;
  kegiatan: { id: string; nama: string; fase: string };
  _count: { rsvps: number; npsEntries: number };
}

const STATUS_CONFIG = {
  PLANNED: { label: 'Akan Datang', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  RUNNING: { label: 'Berlangsung', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  DONE: { label: 'Selesai', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  CANCELLED: { label: 'Dibatalkan', cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

export default function OCKegiatanHubPage() {
  const [instances, setInstances] = useState<InstanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInstances() {
      setLoading(true);
      try {
        const res = await fetch('/api/event/instances/oc');
        const data = await res.json();

        if (!res.ok) {
          toast.apiError(data);
          return;
        }

        setInstances(data.data ?? []);
      } catch (err) {
        toast.apiError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchInstances();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            className="text-white/70 mb-3 text-sm"
          />
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6" />
            <h1 className="text-xl font-bold">Kelola Kegiatan</h1>
          </div>
          <p className="text-sm text-white/80 mt-1">Daftar sesi kegiatan yang dikelola OC</p>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {loading ? (
          <>
            <SkeletonPageHeader />
            <SkeletonTable rows={5} columns={4} />
          </>
        ) : instances.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-12 text-center shadow-sm">
            <CalendarIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Belum ada sesi kegiatan</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sesi kegiatan akan muncul di sini setelah dibuat oleh SC/SUPERADMIN.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {instances.map((inst) => {
              const { label, cls } = STATUS_CONFIG[inst.status];
              return (
                <Link
                  key={inst.id}
                  href={`/dashboard/oc/kegiatan/${inst.id}`}
                  className="group flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-4 hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${cls}`}>
                        {label}
                      </span>
                      <span className="text-xs text-sky-600 dark:text-sky-400 hidden sm:block">
                        Fase {inst.kegiatan.fase}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 group-hover:text-sky-700 dark:group-hover:text-sky-300 line-clamp-1 transition-colors">
                      {inst.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{inst.kegiatan.nama}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(inst.scheduledAt), "d MMM yyyy", { locale: localeId })}
                      </span>
                      <span className="flex items-center gap-1">
                        <UsersIcon className="h-3 w-3" />
                        {inst._count.rsvps} RSVP
                      </span>
                      {inst._count.npsEntries > 0 && (
                        <span>{inst._count.npsEntries} NPS</span>
                      )}
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-sky-500 transition-colors flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

/**
 * src/app/(DashboardLayout)/dashboard/oc/kegiatan/[instanceId]/page.tsx
 * NAWASENA M08 — OC Instance Detail Page (Overview tab with lifecycle controls).
 *
 * Tabs: Overview (lifecycle + meta) | Attendance | Outputs | Evaluation
 * Roles: OC, SC, SUPERADMIN.
 */

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  ClipboardListIcon,
  PackageOpenIcon,
  PlayIcon,
  CheckCircle2Icon,
  XCircleIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { LifecycleControls } from '@/components/event-execution/LifecycleControls';
import { CapacityEditor } from '@/components/event-execution/CapacityEditor';
import { CancellationModal } from '@/components/event-execution/CancellationModal';
import { RescheduleModal } from '@/components/event-execution/RescheduleModal';
import { CancellationProgressIndicator } from '@/components/event-execution/CancellationProgressIndicator';
import { SkeletonCard, SkeletonPageHeader } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';

type InstanceStatus = 'PLANNED' | 'RUNNING' | 'DONE' | 'CANCELLED';

interface InstanceDetail {
  id: string;
  status: InstanceStatus;
  scheduledAt: string;
  executedAt: string | null;
  location: string;
  capacity: number | null;
  version: number;
  rescheduleCount: number;
  notificationFailedCount: number;
  cancelledAt: string | null;
  cancellationReason: string | null;
  notesPanitia: string | null;
  materiLinkUrl: string | null;
  picRoleHint: string | null;
  kegiatan: {
    id: string;
    nama: string;
    fase: string;
    kategori: string;
    intensity: string;
    scale: string;
    deskripsiSingkat: string;
    picRoleHint: string | null;
  };
  _count: {
    rsvps: number;
    attendances: number;
    outputs: number;
  };
}

type ActiveTab = 'overview' | 'attendance' | 'outputs' | 'evaluation';

const STATUS_CONFIG: Record<InstanceStatus, { label: string; color: string }> = {
  PLANNED: { label: 'Direncanakan', color: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400' },
  RUNNING: { label: 'Berjalan', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
  DONE: { label: 'Selesai', color: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400' },
  CANCELLED: { label: 'Dibatalkan', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
};

export default function OCInstanceDetailPage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const { instanceId } = use(params);
  const [detail, setDetail] = useState<InstanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}`);
      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }
      const data = await res.json();
      setDetail(data.data);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="h-32 bg-gradient-to-r from-sky-400 to-blue-500 animate-pulse" />
        <div className="container mx-auto max-w-4xl px-4 py-6 space-y-4">
          <SkeletonPageHeader />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Data tidak ditemukan.</p>
          <Link
            href="/dashboard/oc/kegiatan"
            className="text-sky-600 dark:text-sky-400 hover:underline text-sm mt-2 block"
          >
            Kembali ke daftar
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[detail.status];

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
            href="/dashboard/oc/kegiatan"
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Kembali ke daftar kegiatan
          </Link>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold mb-1">{detail.kegiatan.nama}</h1>
              <p className="text-sm text-white/70">
                Fase {detail.kegiatan.fase} · {detail.kegiatan.kategori}
              </p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 mt-3 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              {format(new Date(detail.scheduledAt), 'd MMM yyyy, HH:mm', { locale: localeId })}
            </span>
            {detail.location && (
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="h-4 w-4" />
                {detail.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <UsersIcon className="h-4 w-4" />
              {detail._count.rsvps} RSVP
              {detail.capacity ? ` / ${detail.capacity}` : ' (unlimited)'}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-4xl px-4 py-6 space-y-5">
        {/* Tab bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'overview', label: 'Ringkasan', icon: PlayIcon },
                { key: 'attendance', label: `Kehadiran (${detail._count.attendances})`, icon: UsersIcon },
                { key: 'outputs', label: `Output (${detail._count.outputs})`, icon: PackageOpenIcon },
                { key: 'evaluation', label: 'Evaluasi', icon: ClipboardListIcon },
              ] as { key: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[]
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-colors ${
                  activeTab === key
                    ? 'bg-sky-500 text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-sky-50 dark:hover:bg-sky-900/20'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Cancellation status if cancelled */}
              {detail.status === 'CANCELLED' && (
                <CancellationProgressIndicator instanceId={instanceId} />
              )}

              {/* Lifecycle controls */}
              {detail.status !== 'DONE' && detail.status !== 'CANCELLED' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    Kontrol Kegiatan
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detail.status === 'PLANNED' && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          if (!confirm('Mulai kegiatan? Status akan berubah ke RUNNING.')) return;
                          try {
                            const res = await fetch(`/api/event-execution/instances/${instanceId}/lifecycle`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'start', version: detail.version }),
                            });
                            const data = await res.json();
                            if (!res.ok) { toast.apiError(data); return; }
                            toast.success('Kegiatan dimulai!');
                            fetchDetail();
                          } catch (err) { toast.apiError(err); }
                        }}
                        className="rounded-xl bg-green-500 hover:bg-green-600 text-white h-8"
                      >
                        <PlayIcon className="mr-1.5 h-3.5 w-3.5" /> Mulai Kegiatan
                      </Button>
                    )}

                    {detail.status === 'RUNNING' && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          if (!confirm('Selesaikan kegiatan? Kehadiran yang belum tercatat akan otomatis ALPA.')) return;
                          try {
                            const res = await fetch(`/api/event-execution/instances/${instanceId}/lifecycle`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'finish', version: detail.version }),
                            });
                            const data = await res.json();
                            if (!res.ok) { toast.apiError(data); return; }
                            toast.success('Kegiatan selesai!');
                            fetchDetail();
                          } catch (err) { toast.apiError(err); }
                        }}
                        className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white h-8"
                      >
                        <CheckCircle2Icon className="mr-1.5 h-3.5 w-3.5" /> Selesaikan
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRescheduleModal(true)}
                      className="rounded-xl h-8 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800"
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" /> Jadwal Ulang
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCancelModal(true)}
                      className="rounded-xl h-8 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <XCircleIcon className="mr-1.5 h-3.5 w-3.5" /> Batalkan
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={fetchDetail}
                      className="rounded-xl h-8 text-gray-400 hover:text-sky-500"
                    >
                      <RefreshCwIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Meta info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Informasi Kegiatan
                </h3>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {/* Capacity */}
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Kapasitas</p>
                    {detail.status !== 'DONE' && detail.status !== 'CANCELLED' ? (
                      <CapacityEditor
                        instanceId={instanceId}
                        capacity={detail.capacity}
                        confirmedCount={detail._count.rsvps}
                        onSuccess={fetchDetail}
                      />
                    ) : (
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        {detail.capacity ?? 'Unlimited'}
                      </p>
                    )}
                  </div>

                  {/* Reschedule count */}
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Reschedule</p>
                    <p className={`font-medium text-sm ${
                      detail.rescheduleCount >= 3
                        ? 'text-red-600 dark:text-red-400'
                        : detail.rescheduleCount > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {detail.rescheduleCount}/3x
                    </p>
                  </div>

                  {/* Executed at */}
                  {detail.executedAt && (
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Dilaksanakan</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300 text-xs">
                        {format(new Date(detail.executedAt), 'd MMM yyyy, HH:mm', { locale: localeId })}
                      </p>
                    </div>
                  )}

                  {/* Notif failures */}
                  {detail.notificationFailedCount > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-1.5">Notifikasi Gagal</p>
                      <p className="font-medium text-amber-700 dark:text-amber-300 text-sm">
                        {detail.notificationFailedCount}x
                      </p>
                    </div>
                  )}
                </div>

                {/* Kegiatan description */}
                {detail.kegiatan.deskripsiSingkat && (
                  <div className="bg-sky-50 dark:bg-sky-950/20 rounded-xl p-3 border border-sky-100 dark:border-sky-900">
                    <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mb-1">Deskripsi Kegiatan</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">{detail.kegiatan.deskripsiSingkat}</p>
                  </div>
                )}

                {/* Notes */}
                {detail.notesPanitia && (
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Catatan Panitia</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{detail.notesPanitia}</p>
                  </div>
                )}

                {/* Material link */}
                {detail.materiLinkUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Materi:</span>
                    <a
                      href={detail.materiLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 dark:text-sky-400 hover:underline text-xs truncate"
                    >
                      {detail.materiLinkUrl}
                    </a>
                  </div>
                )}
              </div>

              {/* Quick links to other tabs */}
              <div className="grid grid-cols-3 gap-3">
                <Link
                  href={`/dashboard/oc/kegiatan/${instanceId}/attendance`}
                  className="flex flex-col items-center gap-1.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors border border-gray-100 dark:border-gray-700"
                >
                  <UsersIcon className="h-5 w-5 text-sky-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Kehadiran</span>
                  <span className="text-xs text-gray-400">{detail._count.attendances}</span>
                </Link>
                <Link
                  href={`/dashboard/oc/kegiatan/${instanceId}/outputs`}
                  className="flex flex-col items-center gap-1.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors border border-gray-100 dark:border-gray-700"
                >
                  <PackageOpenIcon className="h-5 w-5 text-sky-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Output</span>
                  <span className="text-xs text-gray-400">{detail._count.outputs}</span>
                </Link>
                <Link
                  href={`/dashboard/oc/kegiatan/${instanceId}/evaluation`}
                  className="flex flex-col items-center gap-1.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors border border-gray-100 dark:border-gray-700"
                >
                  <ClipboardListIcon className="h-5 w-5 text-sky-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Evaluasi</span>
                  <span className="text-xs text-gray-400">
                    {detail.status === 'DONE' ? 'Tersedia' : 'Belum'}
                  </span>
                </Link>
              </div>
            </div>
          )}

          {/* ===== ATTENDANCE TAB ===== */}
          {activeTab === 'attendance' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kelola kehadiran peserta dan tampilkan QR code untuk scan.
              </p>
              <Link
                href={`/dashboard/oc/kegiatan/${instanceId}/attendance`}
                className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <UsersIcon className="h-4 w-4" />
                Buka Halaman Kehadiran
              </Link>
            </div>
          )}

          {/* ===== OUTPUTS TAB ===== */}
          {activeTab === 'outputs' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload file, link, video, atau repository hasil kegiatan.
              </p>
              <Link
                href={`/dashboard/oc/kegiatan/${instanceId}/outputs`}
                className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <PackageOpenIcon className="h-4 w-4" />
                Buka Halaman Output
              </Link>
            </div>
          )}

          {/* ===== EVALUATION TAB ===== */}
          {activeTab === 'evaluation' && (
            <div className="space-y-3">
              {detail.status !== 'DONE' ? (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  Evaluasi hanya tersedia setelah kegiatan selesai (status DONE).
                  Status saat ini: <strong>{detail.status}</strong>.
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Isi evaluasi pasca-kegiatan dengan data yang sudah pre-filled dari sistem.
                  </p>
                  <Link
                    href={`/dashboard/oc/kegiatan/${instanceId}/evaluation`}
                    className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                  >
                    <ClipboardListIcon className="h-4 w-4" />
                    Buka Halaman Evaluasi
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* LifecycleControls (also embedded for quick access in overview) */}
        {activeTab === 'overview' && detail.status !== 'DONE' && detail.status !== 'CANCELLED' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Kontrol Lifecycle (Cepat)
            </h3>
            <LifecycleControls
              instanceId={instanceId}
              status={detail.status}
              version={detail.version}
              onSuccess={fetchDetail}
            />
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <CancellationModal
          instanceId={instanceId}
          version={detail.version}
          confirmedCount={detail._count.rsvps}
          onSuccess={() => {
            setShowCancelModal(false);
            fetchDetail();
          }}
          onCancel={() => setShowCancelModal(false)}
        />
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <RescheduleModal
          instanceId={instanceId}
          currentScheduledAt={detail.scheduledAt}
          rescheduleCount={detail.rescheduleCount}
          onSuccess={() => {
            setShowRescheduleModal(false);
            fetchDetail();
          }}
          onCancel={() => setShowRescheduleModal(false)}
        />
      )}
    </div>
  );
}

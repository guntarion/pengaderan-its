'use client';

/**
 * src/app/(DashboardLayout)/dashboard/oc/kegiatan/[instanceId]/page.tsx
 * NAWASENA M06 — OC Instance Detail Page.
 *
 * Tabs: RSVP List, Kehadiran (stub), NPS Aggregate.
 * Roles: OC, SC, SUPERADMIN.
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, CalendarIcon, MapPinIcon, UsersIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { OCInstanceTabs, type OCTab } from '@/components/event/OCInstanceTabs';
import { OCRSVPList } from '@/components/event/OCRSVPList';
import { OCAttendanceStub } from '@/components/event/OCAttendanceStub';
import { NPSAggregateCards } from '@/components/event/NPSAggregateCards';
import { NPSHistogram } from '@/components/event/NPSHistogram';
import { NPSInsufficientDataView } from '@/components/event/NPSInsufficientDataView';
import { SkeletonCard, SkeletonPageHeader } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';

interface RSVPEntry {
  id: string;
  status: 'CONFIRMED' | 'WAITLIST' | 'DECLINED';
  respondedAt: string;
  waitlistPosition?: number | null;
  user: {
    id: string;
    fullName: string;
    displayName: string | null;
    nrp?: string | null;
    email: string;
  };
}

interface RSVPData {
  confirmed: RSVPEntry[];
  waitlist: RSVPEntry[];
  declined: RSVPEntry[];
  total: number;
}

interface NPSAggregate {
  insufficientData?: boolean;
  nResponses: number;
  minimumRequired?: number;
  avgNpsScore?: number;
  netPromoterScore?: number;
  avgFeltSafe?: number;
  avgMeaningful?: number;
  histogram?: Record<string, number>;
}

interface OCInstanceDetail {
  id: string;
  status: 'PLANNED' | 'RUNNING' | 'DONE' | 'CANCELLED';
  scheduledAt: string;
  location: string;
  capacity: number | null;
  kegiatan: { id: string; nama: string; fase: string; kategori: string };
  confirmedCount: number;
}

export default function OCInstanceDetailPage({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = use(params);
  const [detail, setDetail] = useState<OCInstanceDetail | null>(null);
  const [rsvpData, setRsvpData] = useState<RSVPData | null>(null);
  const [npsAggregate, setNpsAggregate] = useState<NPSAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OCTab>('rsvp');

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [detailRes, rsvpRes, npsRes] = await Promise.all([
          fetch(`/api/event/instances/${instanceId}/oc`),
          fetch(`/api/event/instances/${instanceId}/rsvp-list`),
          fetch(`/api/event/instances/${instanceId}/nps-aggregate`),
        ]);

        if (detailRes.ok) {
          const d = await detailRes.json();
          setDetail(d.data);
        } else {
          toast.apiError(await detailRes.json());
        }

        if (rsvpRes.ok) {
          const r = await rsvpRes.json();
          setRsvpData(r.data);
        }

        if (npsRes.ok) {
          const n = await npsRes.json();
          setNpsAggregate(n.data);
        }
      } catch (err) {
        toast.apiError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [instanceId]);

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
          <Link href="/dashboard/oc/kegiatan" className="text-sky-600 dark:text-sky-400 hover:underline text-sm mt-2 block">
            Kembali ke daftar
          </Link>
        </div>
      </div>
    );
  }

  const attendanceSummary = {
    total: detail.confirmedCount,
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link
            href="/dashboard/oc/kegiatan"
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Kembali ke daftar kegiatan
          </Link>
          <h1 className="text-xl font-bold mb-1">{detail.kegiatan.nama}</h1>
          <p className="text-sm text-white/70">Fase {detail.kegiatan.fase} · {detail.kegiatan.kategori}</p>
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              {format(new Date(detail.scheduledAt), "d MMM yyyy, HH:mm", { locale: localeId })}
            </span>
            {detail.location && (
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="h-4 w-4" />
                {detail.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <UsersIcon className="h-4 w-4" />
              {detail.confirmedCount} terdaftar{detail.capacity ? ` / ${detail.capacity}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-4xl px-4 py-6 space-y-5">
        {/* Tab bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-4 shadow-sm">
          <OCInstanceTabs active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Tab content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          {activeTab === 'rsvp' && rsvpData && (
            <OCRSVPList instanceId={instanceId} data={rsvpData} />
          )}
          {activeTab === 'rsvp' && !rsvpData && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Memuat data RSVP...</p>
          )}

          {activeTab === 'attendance' && (
            <OCAttendanceStub
              hadir={attendanceSummary.hadir}
              izin={attendanceSummary.izin}
              sakit={attendanceSummary.sakit}
              alpa={attendanceSummary.alpa}
              total={attendanceSummary.total}
            />
          )}

          {activeTab === 'nps' && (
            <div className="space-y-5">
              {!npsAggregate ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Data NPS belum tersedia.</p>
              ) : npsAggregate.insufficientData ? (
                <NPSInsufficientDataView
                  nResponses={npsAggregate.nResponses}
                  minimumRequired={npsAggregate.minimumRequired ?? 5}
                />
              ) : (
                <>
                  <NPSAggregateCards
                    nResponses={npsAggregate.nResponses}
                    avgNpsScore={npsAggregate.avgNpsScore!}
                    netPromoterScore={npsAggregate.netPromoterScore!}
                    avgFeltSafe={npsAggregate.avgFeltSafe!}
                    avgMeaningful={npsAggregate.avgMeaningful!}
                  />
                  {npsAggregate.histogram && (
                    <NPSHistogram histogram={npsAggregate.histogram} total={npsAggregate.nResponses} />
                  )}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-xs text-blue-700 dark:text-blue-400">
                    Data NPS ditampilkan secara agregat untuk menjaga privasi peserta.
                    Komentar individual tidak dapat diakses oleh OC.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

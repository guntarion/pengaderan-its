'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kegiatan/[instanceId]/page.tsx
 * NAWASENA M06 — Maba Instance Detail Page.
 *
 * Shows kegiatan instance detail with RSVP button and attendee list.
 * Links to NPS form if eligible.
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { InstanceDetailHero } from '@/components/event/InstanceDetailHero';
import { InstanceMetaBadges } from '@/components/event/InstanceMetaBadges';
import { RSVPButton } from '@/components/event/RSVPButton';
import { RSVPListView } from '@/components/event/RSVPListView';
import { SkeletonCard, SkeletonPageHeader } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { StarIcon } from 'lucide-react';

interface RSVPListEntry {
  id: string;
  status: 'CONFIRMED';
  userName: string;
}

interface RSVPListResult {
  confirmed: RSVPListEntry[];
  myRsvp: { id: string; status: 'CONFIRMED' | 'WAITLIST' | 'DECLINED'; waitlistPosition: number | null } | null;
  total: number;
}

interface InstanceDetail {
  id: string;
  status: 'PLANNED' | 'RUNNING' | 'DONE' | 'CANCELLED';
  scheduledAt: string;
  executedAt: string | null;
  location: string;
  locationDisplay: string;
  capacity: number | null;
  confirmedCount: number;
  myRsvp: { status: 'CONFIRMED' | 'WAITLIST' | 'DECLINED' } | null;
  kegiatan: {
    id: string;
    nama: string;
    fase: string;
    kategori: string;
    durasiMenit?: number;
    deskripsiSingkat?: string | null;
  };
}

export default function InstanceDetailPage({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = use(params);
  const [detail, setDetail] = useState<InstanceDetail | null>(null);
  const [rsvpList, setRsvpList] = useState<RSVPListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<'CONFIRMED' | 'WAITLIST' | 'DECLINED' | null>(null);
  const [canNPS, setCanNPS] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      try {
        const [detailRes, npsRes, rsvpRes] = await Promise.all([
          fetch(`/api/event/instances/${instanceId}`),
          fetch(`/api/event/nps/${instanceId}/me`),
          fetch(`/api/event/instances/${instanceId}/rsvp-list`),
        ]);

        const detailData = await detailRes.json();
        if (!detailRes.ok) {
          toast.apiError(detailData);
          return;
        }

        setDetail(detailData.data);
        setRsvpStatus(detailData.data.myRsvp?.status ?? null);

        if (npsRes.ok) {
          const npsData = await npsRes.json();
          setCanNPS(npsData.data?.canSubmit === true);
        }

        if (rsvpRes.ok) {
          const rsvpData = await rsvpRes.json();
          setRsvpList(rsvpData.data);
        }
      } catch (err) {
        toast.apiError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [instanceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="h-32 bg-gradient-to-r from-sky-400 to-blue-500 animate-pulse" />
        <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
          <SkeletonPageHeader />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Kegiatan tidak ditemukan.</p>
          <Link href="/dashboard/kegiatan" className="text-sky-600 dark:text-sky-400 hover:underline text-sm mt-2 block">
            Kembali ke daftar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      <InstanceDetailHero
        title={detail.kegiatan.nama}
        kegiatanNama={detail.kegiatan.nama}
        kegiatanId={detail.kegiatan.id}
        status={detail.status}
      />

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-5">
        {/* Meta badges */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <InstanceMetaBadges
            scheduledAt={detail.scheduledAt}
            executedAt={detail.executedAt}
            location={detail.locationDisplay || detail.location}
            capacity={detail.capacity}
            rsvpCount={detail.confirmedCount}
            fase={detail.kegiatan.fase}
            kategori={detail.kegiatan.kategori}
            durasiMenit={detail.kegiatan.durasiMenit ?? null}
          />
        </div>

        {/* Description */}
        {detail.kegiatan.deskripsiSingkat && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
            <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Tentang Kegiatan</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{detail.kegiatan.deskripsiSingkat}</p>
          </div>
        )}

        {/* CANCELLED notice */}
        {detail.status === 'CANCELLED' && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-400">
            Kegiatan ini telah dibatalkan.
          </div>
        )}

        {/* RSVP section */}
        {detail.status !== 'DONE' && detail.status !== 'CANCELLED' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
            <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Pendaftaran</h2>
            <RSVPButton
              instanceId={instanceId}
              currentStatus={rsvpStatus}
              instanceStatus={detail.status}
              onStatusChange={(s) => setRsvpStatus(s)}
            />
          </div>
        )}

        {/* NPS CTA */}
        {canNPS && (
          <Link
            href={`/dashboard/kegiatan/${instanceId}/nps`}
            className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 hover:shadow-md transition-all group"
          >
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <StarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                Berikan Feedback
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Bantu kami tingkatkan kualitas kegiatan dengan mengisi formulir NPS
              </p>
            </div>
          </Link>
        )}

        {/* Attendee list */}
        {rsvpList && rsvpList.confirmed.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
            <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Peserta Terdaftar</h2>
            <RSVPListView confirmed={rsvpList.confirmed} total={rsvpList.total} />
          </div>
        )}
      </div>
    </div>
  );
}

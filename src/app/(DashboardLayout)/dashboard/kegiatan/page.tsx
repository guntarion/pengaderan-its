'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kegiatan/page.tsx
 * NAWASENA M06 — Maba Kegiatan Listing Page.
 *
 * Shows three buckets: Akan Datang, Sedang Berlangsung, Telah Selesai.
 * Filterable by Fase + Kategori. Each card links to instance detail.
 */

import { useState, useEffect, useCallback } from 'react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCardGrid, SkeletonPageHeader } from '@/components/shared/skeletons';
import { InstanceListTabs } from '@/components/event/InstanceListTabs';
import { InstanceCard } from '@/components/event/InstanceCard';
import { InstanceFilter } from '@/components/event/InstanceFilter';
import { toast } from '@/lib/toast';
import { CalendarIcon } from 'lucide-react';

type TabKey = 'upcoming' | 'ongoing' | 'past';

interface InstanceData {
  id: string;
  scheduledAt: string;
  locationDisplay: string;
  capacity: number | null;
  status: 'PLANNED' | 'RUNNING' | 'DONE' | 'CANCELLED';
  kegiatan: {
    id: string;
    nama: string;
    fase: string;
    kategori: string;
  };
  confirmedCount: number;
  myRsvp: { status: 'CONFIRMED' | 'WAITLIST' | 'DECLINED' } | null;
}

interface ListingData {
  upcoming: InstanceData[];
  ongoing: InstanceData[];
  past: InstanceData[];
}

export default function KegiatanListingPage() {
  const [listing, setListing] = useState<ListingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [fase, setFase] = useState('all');
  const [kategori, setKategori] = useState('all');

  const fetchListing = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fase !== 'all') params.set('fase', fase);
      if (kategori !== 'all') params.set('kategori', kategori);

      const res = await fetch(`/api/event/instances?${params}`);
      const data = await res.json();

      if (!res.ok) {
        toast.apiError(data);
        return;
      }

      setListing(data.data);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [fase, kategori]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const counts = listing
    ? {
        upcoming: listing.upcoming.length,
        ongoing: listing.ongoing.length,
        past: listing.past.length,
      }
    : { upcoming: 0, ongoing: 0, past: 0 };

  const activeList = listing ? listing[activeTab] : [];

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
            <h1 className="text-xl font-bold">Kegiatan Saya</h1>
          </div>
          <p className="text-sm text-white/80 mt-1">Daftar kegiatan masa orientasi kamu</p>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-5">
        {loading ? (
          <>
            <SkeletonPageHeader />
            <SkeletonCardGrid count={4} />
          </>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <InstanceListTabs active={activeTab} counts={counts} onChange={setActiveTab} />
              <InstanceFilter
                fase={fase}
                kategori={kategori}
                onFaseChange={setFase}
                onKategoriChange={setKategori}
              />
            </div>

            {/* Grid */}
            {activeList.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-12 text-center shadow-sm">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                  Tidak ada kegiatan
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {activeTab === 'upcoming'
                    ? 'Belum ada kegiatan yang akan datang untuk kategori ini.'
                    : activeTab === 'ongoing'
                    ? 'Tidak ada kegiatan yang sedang berlangsung.'
                    : 'Belum ada kegiatan yang selesai.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeList.map((instance) => (
                  <InstanceCard key={instance.id} instance={instance} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

'use client';

/**
 * src/app/(DashboardLayout)/dashboard/time-capsule/page.tsx
 * NAWASENA M07 — Time Capsule list page for Maba.
 *
 * Shows all published entries with filter (mood, share status) and search.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { getMoodEmoji } from '@/components/time-capsule/MoodSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { SkeletonCardGrid, SkeletonPageHeader } from '@/components/shared/skeletons';
import { PlusIcon, SearchIcon, LockIcon, ShareIcon } from 'lucide-react';

interface TimeCapsuleEntry {
  id: string;
  title: string | null;
  body: string;
  mood: number | null;
  sharedWithKasuh: boolean;
  publishedAt: string;
  editableUntil: string;
  attachments: Array<{ id: string; mimeType: string }>;
}

interface ListResponse {
  success: boolean;
  data: TimeCapsuleEntry[];
  meta?: { pagination: { page: number; limit: number; total: number; totalPages: number } };
}

export default function TimeCapsulePage() {
  const [entries, setEntries] = useState<TimeCapsuleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moodFilter, setMoodFilter] = useState('all');
  const [shareFilter, setShareFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (search) params.set('search', search);
      if (moodFilter !== 'all') params.set('mood', moodFilter);
      if (shareFilter !== 'all') params.set('sharedWithKasuh', shareFilter);

      const res = await fetch(`/api/time-capsule?${params}`);
      const json: ListResponse = await res.json();

      if (json.success) {
        setEntries(json.data);
        setTotal(json.meta?.pagination.total ?? 0);
      } else {
        toast.error('Gagal memuat catatan');
      }
    } catch {
      toast.error('Gagal memuat catatan');
    } finally {
      setLoading(false);
    }
  }, [page, search, moodFilter, shareFilter]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            labels={{ 'time-capsule': 'Time Capsule' }}
            className="text-white/70 mb-2 text-sm"
          />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Time Capsule</h1>
              <p className="text-sm text-white/80 mt-0.5">
                Dokumentasikan perjalananmu selama NAWASENA
              </p>
            </div>
            <Link href="/dashboard/time-capsule/new">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1.5 rounded-xl">
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Tulis Baru</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari catatan..."
              className="pl-9 rounded-xl border-sky-200 dark:border-sky-800"
            />
          </div>
          <Select value={moodFilter} onValueChange={(v) => { setMoodFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-36 rounded-xl border-sky-200 dark:border-sky-800">
              <SelectValue placeholder="Semua Mood" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mood</SelectItem>
              <SelectItem value="1">😔 Sangat Buruk</SelectItem>
              <SelectItem value="2">😕 Buruk</SelectItem>
              <SelectItem value="3">😐 Biasa</SelectItem>
              <SelectItem value="4">😊 Baik</SelectItem>
              <SelectItem value="5">😄 Sangat Baik</SelectItem>
            </SelectContent>
          </Select>
          <Select value={shareFilter} onValueChange={(v) => { setShareFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl border-sky-200 dark:border-sky-800">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="true">Dibagikan ke Kasuh</SelectItem>
              <SelectItem value="false">Privat</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Entry list */}
        {loading ? (
          <>
            <SkeletonPageHeader />
            <SkeletonCardGrid count={3} />
          </>
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-12 text-center">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Belum ada catatan
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mulai dokumentasikan perjalananmu hari ini
            </p>
            <Link href="/dashboard/time-capsule/new" className="mt-4 inline-block">
              <Button className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl mt-4">
                Tulis Catatan Pertama
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <Link key={entry.id} href={`/dashboard/time-capsule/${entry.id}`}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 hover:border-sky-300 dark:hover:border-sky-700 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {entry.title && (
                          <h3 className="font-medium text-gray-800 dark:text-gray-100 truncate">
                            {entry.title}
                          </h3>
                        )}
                        {!entry.title && (
                          <h3 className="font-medium text-gray-500 dark:text-gray-400 italic text-sm">
                            Tanpa judul
                          </h3>
                        )}
                        {entry.mood && (
                          <span className="text-lg" title={`Mood: ${entry.mood}/5`}>
                            {getMoodEmoji(entry.mood)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {entry.body.replace(/[#*`>[\]]/g, '').slice(0, 150)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {entry.sharedWithKasuh ? (
                        <span className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400">
                          <ShareIcon className="h-3 w-3" /> Dibagikan
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <LockIcon className="h-3 w-3" /> Privat
                        </span>
                      )}
                      {entry.attachments.length > 0 && (
                        <span className="text-xs text-gray-400">
                          📎 {entry.attachments.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {format(new Date(entry.publishedAt), 'EEEE, d MMMM yyyy · HH:mm', { locale: localeId })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl"
            >
              Sebelumnya
            </Button>
            <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl"
            >
              Selanjutnya
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

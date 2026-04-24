'use client';

/**
 * /dashboard/konsekuensi
 * NAWASENA M10 — Maba self-list of assigned consequences.
 *
 * Accessible by any authenticated user. Shows only the current user's
 * ConsequenceLog entries via GET /api/konsekuensi/me.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronRight, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const log = createLogger('konsekuensi-list-page');

// ---- Types ----

interface ConsequenceItem {
  id: string;
  type: string;
  status: string;
  reasonText: string;
  deadline: string | null;
  pointsDeducted: number | null;
  createdAt: string;
}

// ---- Label maps ----

const TYPE_LABELS: Record<string, string> = {
  REFLEKSI_500_KATA: 'Refleksi 500 Kata',
  PRESENTASI_ULANG: 'Presentasi Ulang',
  POIN_PASSPORT_DIKURANGI: 'Pengurangan Poin Passport',
  PERINGATAN_TERTULIS: 'Peringatan Tertulis',
  TUGAS_PENGABDIAN: 'Tugas Pengabdian',
};

const STATUS_STYLES: Record<string, string> = {
  ASSIGNED: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300',
  NEEDS_REVISION: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
  PENDING_REVIEW: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
  OVERDUE: 'bg-red-100 text-red-900 border-red-400 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Perlu Dikerjakan',
  NEEDS_REVISION: 'Perlu Revisi',
  PENDING_REVIEW: 'Menunggu Review',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  OVERDUE: 'Terlambat',
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ASSIGNED: Clock,
  NEEDS_REVISION: AlertCircle,
  PENDING_REVIEW: RefreshCw,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  OVERDUE: AlertCircle,
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (['APPROVED', 'REJECTED'].includes(status)) return false;
  return new Date(deadline) < new Date();
}

// ---- Page component ----

export default function KonsekuensiListPage() {
  const [items, setItems] = useState<ConsequenceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/konsekuensi/me?limit=50');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      log.error('Failed to fetch consequences', { error: err });
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const activeItems = items.filter((i) => !['APPROVED', 'REJECTED'].includes(i.status));
  const completedItems = items.filter((i) => ['APPROVED', 'REJECTED'].includes(i.status));

  function renderCard(item: ConsequenceItem) {
    const actualStatus = isOverdue(item.deadline, item.status) ? 'OVERDUE' : item.status;
    const StatusIcon = STATUS_ICONS[actualStatus] ?? Clock;
    const deadlineDate = formatDate(item.deadline);

    return (
      <Link
        key={item.id}
        href={`/dashboard/konsekuensi/${item.id}`}
        className="block bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-4 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs border',
                  STATUS_STYLES[actualStatus] ?? 'bg-gray-100 text-gray-700',
                )}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {STATUS_LABELS[actualStatus] ?? actualStatus}
              </Badge>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {TYPE_LABELS[item.type] ?? item.type}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
              {item.reasonText}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-xs text-gray-400">
                Diberikan {formatDate(item.createdAt)}
              </p>
              {deadlineDate && (
                <p
                  className={cn(
                    'text-xs font-medium',
                    isOverdue(item.deadline, item.status)
                      ? 'text-red-500'
                      : 'text-amber-600 dark:text-amber-400',
                  )}
                >
                  Deadline: {deadlineDate}
                </p>
              )}
              {item.pointsDeducted && (
                <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                  -{item.pointsDeducted} poin passport
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-sky-500 transition-colors flex-shrink-0 mt-1" />
        </div>
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <DynamicBreadcrumb
          labels={{ konsekuensi: 'Konsekuensi Saya' }}
          homeHref="/dashboard"
        />

        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-5 text-white shadow-sm">
          <h1 className="text-xl font-bold">Konsekuensi Saya</h1>
          <p className="text-sm text-sky-100 mt-1">
            Daftar konsekuensi pedagogis yang diberikan kepada Anda
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} className="h-24" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tidak ada konsekuensi
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Anda belum mendapatkan konsekuensi pedagogis
            </p>
          </div>
        ) : (
          <>
            {/* Active consequences */}
            {activeItems.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-1">
                  Perlu Ditindaklanjuti ({activeItems.length})
                </h2>
                {activeItems.map(renderCard)}
              </div>
            )}

            {/* Completed consequences */}
            {completedItems.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-500 px-1 mt-2">
                  Selesai ({completedItems.length})
                </h2>
                {completedItems.map(renderCard)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

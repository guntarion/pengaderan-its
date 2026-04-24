'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kp/log/weekly/page.tsx
 * NAWASENA M09 — KP Weekly Debrief page.
 *
 * Shows weekly context from daily logs + debrief form or submitted view.
 */

import { useEffect, useState, useCallback } from 'react';
import { WeeklyContextCard } from '@/components/m09/WeeklyContextCard';
import { KPWeeklyForm } from '@/components/m09/KPWeeklyForm';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonForm } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Badge } from '@/components/ui/badge';
import { NotebookPen, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState as useLocalState } from 'react';

const log = createLogger('kp-weekly-page');

interface WeeklyFormState {
  weekNumber: number;
  yearNumber: number;
  existing: {
    id: string;
    whatWorked: string;
    whatDidnt: string;
    changesNeeded: string;
    submittedAt: string;
  } | null;
  weeklyContext: {
    weekNumber: number;
    yearNumber: number;
    avgMood: number | null;
    dailyCount: number;
    redFlagBreakdown: {
      INJURY: number;
      SHUTDOWN: number;
      MENANGIS: number;
      KONFLIK: number;
      WITHDRAW: number;
      LAINNYA: number;
    };
    anecdoteList: Array<{ date: string; note: string }>;
  } | null;
  history: Array<{
    id: string;
    weekNumber: number;
    yearNumber: number;
    whatWorked: string;
    submittedAt: string;
  }>;
}

export default function KPWeeklyLogPage() {
  const [formState, setFormState] = useState<WeeklyFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useLocalState(false);

  const fetchFormState = useCallback(async () => {
    try {
      log.info('Fetching KP weekly form state');
      const res = await fetch('/api/kp/log/weekly');
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setFormState(json.data);
    } catch (err) {
      log.error('Failed to fetch weekly form state', { err });
      toast.error('Gagal memuat data debrief mingguan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFormState();
  }, [fetchFormState]);

  const handleSubmitSuccess = () => {
    fetchFormState();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <DynamicBreadcrumb />
            <h1 className="text-xl font-bold mt-2">Weekly Debrief</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <SkeletonForm fields={4} />
        </div>
      </div>
    );
  }

  const { weekNumber, yearNumber, existing, weeklyContext, history } = formState ?? {
    weekNumber: 0,
    yearNumber: new Date().getFullYear(),
    existing: null,
    weeklyContext: null,
    history: [],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Weekly Debrief</h1>
              <p className="text-sm text-white/80">
                Minggu ke-{weekNumber}, {yearNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Weekly context from daily logs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-4">
            Ringkasan Minggu Ini
          </h2>
          <WeeklyContextCard context={weeklyContext} />
        </div>

        {/* Form or submitted view */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
          {existing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <h2 className="font-semibold text-gray-800 dark:text-white">
                  Debrief Sudah Dikirim
                </h2>
                <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {new Date(existing.submittedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Badge>
              </div>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide mb-1">
                    Yang Berjalan Baik
                  </p>
                  <p className="border-l-2 border-emerald-200 dark:border-emerald-800 pl-3">
                    {existing.whatWorked}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide mb-1">
                    Yang Tidak Berjalan
                  </p>
                  <p className="border-l-2 border-amber-200 dark:border-amber-800 pl-3">
                    {existing.whatDidnt}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide mb-1">
                    Perubahan yang Perlu
                  </p>
                  <p className="border-l-2 border-sky-200 dark:border-sky-800 pl-3">
                    {existing.changesNeeded}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Debrief telah dikirim dan dapat dibaca oleh sesama KP di cohortmu.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-800 dark:text-white">
                Isi Debrief Minggu Ini
              </h2>
              <KPWeeklyForm
                weekNumber={weekNumber}
                yearNumber={yearNumber}
                prefill={
                  weeklyContext
                    ? {
                        whatWorked:
                          weeklyContext.anecdoteList.length > 0
                            ? `Berdasarkan catatan harian: ${weeklyContext.anecdoteList
                                .slice(0, 2)
                                .map((a) => a.note.substring(0, 80))
                                .join('. ')}.`
                            : '',
                      }
                    : null
                }
                onSuccess={handleSubmitSuccess}
              />
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => setShowHistory(!showHistory)}
            >
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm">
                Riwayat Debrief ({history.length})
              </h2>
              {showHistory ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {showHistory && (
              <div className="mt-4 space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Minggu ke-{entry.weekNumber}, {entry.yearNumber}
                      </p>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.submittedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {entry.whatWorked.substring(0, 150)}
                      {entry.whatWorked.length > 150 && '...'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

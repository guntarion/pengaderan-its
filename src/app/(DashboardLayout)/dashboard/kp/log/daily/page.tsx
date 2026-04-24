'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kp/log/daily/page.tsx
 * NAWASENA M09 — KP Daily Stand-up Log page.
 *
 * Displays today's form + 7-day history. Edit within 48h.
 * API response: { formState, history, kpGroupId, cohortId }
 */

import { useEffect, useState, useCallback } from 'react';
import { KPDailyForm } from '@/components/m09/KPDailyForm';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonForm } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ClipboardList,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Pencil,
} from 'lucide-react';

const log = createLogger('kp-daily-page');

interface KPLogDailyEntry {
  id: string;
  moodAvg: number;
  redFlagsObserved: string[];
  anecdoteShort: string | null;
  redFlagOther: string | null;
  date: string;
  recordedAt: string;
  editedAt: string | null;
}

interface ApiFormState {
  existingLog: KPLogDailyEntry | null;
  suggestedMood: number | null;
  responderCount: number;
  totalMembers: number;
  isEditable: boolean;
  date: string;
}

interface PageData {
  formState: ApiFormState;
  history: KPLogDailyEntry[];
  kpGroupId: string;
  cohortId: string;
}

const MOOD_EMOJI: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
};

const MOOD_LABELS: Record<number, string> = {
  1: 'Sangat Buruk',
  2: 'Buruk',
  3: 'Cukup',
  4: 'Baik',
  5: 'Sangat Baik',
};

const MOOD_COLORS: Record<number, string> = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-amber-500',
  4: 'text-sky-500',
  5: 'text-emerald-500',
};

export default function KPDailyLogPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState<KPLogDailyEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchFormState = useCallback(async () => {
    try {
      log.info('Fetching KP daily form state');
      const res = await fetch('/api/kp/log/daily');
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setPageData(json.data);
    } catch (err) {
      log.error('Failed to fetch form state', { err });
      toast.error('Gagal memuat data log harian');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFormState();
  }, [fetchFormState]);

  const handleSubmitSuccess = () => {
    setEditDialogOpen(false);
    setEditEntry(null);
    fetchFormState();
  };

  const handleEditClick = (entry: KPLogDailyEntry, canEdit: boolean) => {
    if (!canEdit) {
      toast.error('Waktu edit telah habis (lebih dari 48 jam)');
      return;
    }
    setEditEntry(entry);
    setEditDialogOpen(true);
  };

  // Compute canEdit from recordedAt (48h window)
  const isEditableEntry = (entry: KPLogDailyEntry): boolean => {
    const recordedAt = entry.editedAt ?? entry.recordedAt;
    const age = Date.now() - new Date(recordedAt).getTime();
    return age <= 48 * 60 * 60 * 1000;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <DynamicBreadcrumb />
            <h1 className="text-xl font-bold mt-2">Log Daily KP</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <SkeletonForm fields={4} />
        </div>
      </div>
    );
  }

  const formState = pageData?.formState ?? null;
  const history = pageData?.history ?? [];
  const today = formState?.existingLog ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Log Daily KP</h1>
              <p className="text-sm text-white/80">Catat mood dan observasi harianmu</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Today's form or already-submitted notice */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
          {today ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <h2 className="font-semibold text-gray-800 dark:text-white">
                    Sudah Diisi Hari Ini
                  </h2>
                </div>
                {formState?.isEditable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(today, formState?.isEditable ?? false)}
                    className="text-sky-600 border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                <span className="text-3xl">{MOOD_EMOJI[today.moodAvg] ?? '😐'}</span>
                <div>
                  <p className={`font-bold text-lg ${MOOD_COLORS[today.moodAvg] ?? 'text-gray-500'}`}>
                    {MOOD_LABELS[today.moodAvg] ?? today.moodAvg}/5
                  </p>
                  <p className="text-xs text-gray-400">
                    Dikirim{' '}
                    {new Date(today.recordedAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {today.redFlagsObserved.length > 0 && (
                  <div className="ml-auto flex flex-wrap gap-1">
                    {today.redFlagsObserved.map((flag) => (
                      <Badge
                        key={flag}
                        className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {flag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {today.anecdoteShort && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic border-l-2 border-sky-200 dark:border-sky-800 pl-3">
                  {today.anecdoteShort}
                </p>
              )}

              {!formState?.isEditable && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  Waktu edit sudah habis (48 jam setelah pengisian)
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-800 dark:text-white">Isi Log Harian</h2>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <KPDailyForm
                suggestedMoodData={
                  formState
                    ? {
                        suggestedMood: formState.suggestedMood,
                        responderCount: formState.responderCount,
                        groupSize: formState.totalMembers,
                      }
                    : null
                }
                onSuccess={handleSubmitSuccess}
              />
            </div>
          )}
        </div>

        {/* 7-day history */}
        {history.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
              Riwayat 7 Hari Terakhir
            </h2>
            <div className="space-y-2">
              {history
                .filter((e) => e.id !== today?.id)
                .map((entry) => {
                  const canEdit = isEditableEntry(entry);
                  return (
                    <div
                      key={entry.id}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 p-4 flex items-center gap-3"
                    >
                      <span className="text-2xl shrink-0">{MOOD_EMOJI[entry.moodAvg] ?? '😐'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 dark:text-white">
                            {new Date(entry.date).toLocaleDateString('id-ID', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                          <span
                            className={`text-sm font-semibold ${MOOD_COLORS[entry.moodAvg] ?? 'text-gray-500'}`}
                          >
                            {entry.moodAvg}/5
                          </span>
                        </div>
                        {entry.redFlagsObserved.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.redFlagsObserved.map((flag) => (
                              <span
                                key={flag}
                                className="text-xs bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-1.5 py-0.5 rounded-full"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(entry, canEdit)}
                          className="shrink-0 text-sky-600 border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Log Harian</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <KPDailyForm
              existingEntry={{
                id: editEntry.id,
                moodScore: editEntry.moodAvg,
                redFlagsObserved: editEntry.redFlagsObserved,
                anecdoteNote: editEntry.anecdoteShort,
                lainnyaNote: editEntry.redFlagOther,
                date: editEntry.date,
                canEdit: isEditableEntry(editEntry),
              }}
              suggestedMoodData={
                formState
                  ? {
                      suggestedMood: formState.suggestedMood,
                      responderCount: formState.responderCount,
                      groupSize: formState.totalMembers,
                    }
                  : null
              }
              onSuccess={handleSubmitSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

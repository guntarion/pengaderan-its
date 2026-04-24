'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kasuh/adik/[mabaId]/logbook/page.tsx
 * NAWASENA M09 — Kasuh logbook for a specific adik asuh.
 *
 * URL: /dashboard/kasuh/adik/[mabaId]/logbook?pairId=xxx
 * Shows current cycle form + history of past cycles.
 * API response shape from getFormState: { existingLog, cycleNumber, cycleDueDate, pairId, mabaUserId, mabaName }
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { KasuhLogForm } from '@/components/m09/KasuhLogForm';
import { CycleStatusBadge } from '@/components/m09/CycleStatusBadge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonForm } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import type { CycleStatus } from '@/components/m09/CycleStatusBadge';
import { BookOpen, CheckCircle, Users, UserX, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState as useLocalState } from 'react';

const log = createLogger('kasuh-logbook-page');

interface KasuhLogEntry {
  id: string;
  attendance: 'MET' | 'NOT_MET';
  reflection?: string | null;
  attendanceReason?: string | null;
  followupNotes?: string | null;
  flagUrgent: boolean;
  submittedAt: string;
}

interface ApiFormState {
  existingLog: KasuhLogEntry | null;
  cycleNumber: number;
  cycleDueDate: string;
  pairId: string;
  mabaUserId: string;
  mabaName: string | null;
}

function computeCycleStatus(
  existingLog: KasuhLogEntry | null,
  cycleDueDate: string,
): CycleStatus {
  if (existingLog) return 'SUBMITTED';
  const due = new Date(cycleDueDate);
  const now = new Date();
  const GRACE_MS = 3 * 24 * 60 * 60 * 1000;
  if (now > new Date(due.getTime() + GRACE_MS)) return 'OVERDUE';
  if (now > new Date(due.getTime() - 3 * 24 * 60 * 60 * 1000)) return 'DUE';
  return 'UPCOMING';
}

export default function KasuhLogbookPage() {
  const params = useParams<{ mabaId: string }>();
  const searchParams = useSearchParams();
  const pairId = searchParams.get('pairId') ?? '';

  const [formState, setFormState] = useState<ApiFormState | null>(null);
  const [history, setHistory] = useState<KasuhLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useLocalState(false);

  const fetchData = useCallback(async () => {
    if (!pairId) return;
    try {
      log.info('Fetching Kasuh logbook form state', { pairId });
      const [formRes, histRes] = await Promise.all([
        fetch(`/api/kasuh/log/${pairId}`),
        fetch(`/api/kasuh/log/${pairId}/history`),
      ]);

      if (!formRes.ok) {
        toast.apiError(await formRes.json());
        return;
      }
      const formJson = await formRes.json();
      setFormState(formJson.data);

      if (histRes.ok) {
        const histJson = await histRes.json();
        setHistory(histJson.data ?? []);
      }
    } catch (err) {
      log.error('Failed to fetch Kasuh logbook', { err });
      toast.error('Gagal memuat logbook');
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitSuccess = () => {
    setLoading(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <DynamicBreadcrumb />
            <h1 className="text-xl font-bold mt-2">Logbook Adik Asuh</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <SkeletonForm fields={4} />
        </div>
      </div>
    );
  }

  if (!formState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Data tidak ditemukan atau pair tidak valid.</p>
      </div>
    );
  }

  const displayName = formState.mabaName ?? 'Adik Asuh';
  const cycleStatus = computeCycleStatus(formState.existingLog, formState.cycleDueDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            labels={{ [params.mabaId]: displayName }}
            homeLabel="Dashboard"
            homeHref="/dashboard"
          />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Logbook — {displayName}</h1>
              <p className="text-sm text-white/80">Siklus ke-{formState.cycleNumber}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Cycle status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Status Siklus
              </p>
              <CycleStatusBadge status={cycleStatus} />
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>Jatuh tempo</p>
              <p className="font-medium text-gray-600 dark:text-gray-400">
                {new Date(formState.cycleDueDate).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Form or submitted view */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
          {formState.existingLog ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <h2 className="font-semibold text-gray-800 dark:text-white">
                  Log Siklus Sudah Diisi
                </h2>
              </div>

              <div className="flex items-center gap-2 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                {formState.existingLog.attendance === 'MET' ? (
                  <Users className="h-5 w-5 text-emerald-500" />
                ) : (
                  <UserX className="h-5 w-5 text-amber-500" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formState.existingLog.attendance === 'MET' ? 'Bertemu' : 'Tidak Bertemu'}
                </span>
                {formState.existingLog.flagUrgent && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    Urgent
                  </span>
                )}
              </div>

              {formState.existingLog.reflection && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    {formState.existingLog.attendance === 'MET' ? 'Refleksi Pertemuan' : 'Catatan Tambahan'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 border-l-2 border-sky-200 dark:border-sky-800 pl-3">
                    {formState.existingLog.reflection}
                  </p>
                </div>
              )}

              {formState.existingLog.attendanceReason && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Alasan Tidak Bertemu
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 border-l-2 border-amber-200 dark:border-amber-800 pl-3">
                    {formState.existingLog.attendanceReason}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Dikirim{' '}
                {new Date(formState.existingLog.submittedAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-800 dark:text-white">
                Log Siklus ke-{formState.cycleNumber}
              </h2>
              <KasuhLogForm
                pairId={formState.pairId}
                cycleNumber={formState.cycleNumber}
                mabaName={displayName}
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
                Riwayat Logbook ({history.length} siklus)
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
                    className="flex items-start gap-3 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800"
                  >
                    {entry.attendance === 'MET' ? (
                      <Users className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <UserX className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {entry.attendance === 'MET' ? 'Bertemu' : 'Tidak Bertemu'}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0">
                          {new Date(entry.submittedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      {entry.reflection && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {entry.reflection.substring(0, 100)}
                          {entry.reflection.length > 100 && '...'}
                        </p>
                      )}
                      {entry.flagUrgent && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3" />
                          Urgent
                        </span>
                      )}
                    </div>
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

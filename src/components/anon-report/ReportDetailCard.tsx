'use client';

/**
 * src/components/anon-report/ReportDetailCard.tsx
 * NAWASENA M12 — Report detail view card.
 *
 * Tabs: Details | Internal Notes | Satgas Notes (conditional)
 * satgasNotes only visible for SATGAS/SUPERADMIN.
 */

import { useState } from 'react';
import { SeverityBadge } from './SeverityBadge';
import { AnonSeverity, AnonStatus, AnonCategory } from '@prisma/client';

const STATUS_LABELS: Record<AnonStatus, string> = {
  NEW: 'Baru',
  IN_REVIEW: 'Sedang Ditinjau',
  RESOLVED: 'Selesai',
  ESCALATED_TO_SATGAS: 'Diteruskan ke Satgas',
};

const STATUS_COLORS: Record<AnonStatus, string> = {
  NEW: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  IN_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  ESCALATED_TO_SATGAS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const CATEGORY_LABELS: Record<AnonCategory, string> = {
  BULLYING: 'Perundungan',
  HARASSMENT: 'Pelecehan',
  UNFAIR: 'Ketidakadilan',
  SUGGESTION: 'Saran',
  OTHER: 'Lainnya',
};

export interface ReportDetailData {
  id: string;
  trackingCode: string;
  category: AnonCategory;
  severity: AnonSeverity;
  status: AnonStatus;
  bodyText: string;
  bodyRedacted: boolean;
  reporterSeverity?: AnonSeverity | null;
  satgasNotes?: string | null;
  resolutionNotes?: string | null;
  publicNote?: string | null;
  acknowledgedAt?: string | Date | null;
  recordedAt: string | Date;
  closedAt?: string | Date | null;
}

interface ReportDetailCardProps {
  report: ReportDetailData;
  /** Whether to show Satgas tab (for SATGAS / SUPERADMIN roles) */
  showSatgasNotes?: boolean;
  /** Whether to show internal resolution notes (for BLM / SUPERADMIN) */
  showInternalNotes?: boolean;
}

type Tab = 'details' | 'internal' | 'satgas';

export function ReportDetailCard({
  report,
  showSatgasNotes = false,
  showInternalNotes = false,
}: ReportDetailCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const allTabs: Array<{ key: Tab; label: string; show: boolean }> = [
    { key: 'details', label: 'Detail', show: true },
    { key: 'internal', label: 'Catatan Internal', show: showInternalNotes },
    { key: 'satgas', label: 'Catatan Satgas', show: showSatgasNotes },
  ];
  const tabs = allTabs.filter((t) => t.show);

  const recordedDate =
    report.recordedAt instanceof Date
      ? report.recordedAt
      : new Date(report.recordedAt);

  const acknowledgedDate =
    report.acknowledgedAt
      ? report.acknowledgedAt instanceof Date
        ? report.acknowledgedAt
        : new Date(report.acknowledgedAt)
      : null;

  return (
    <div className="rounded-2xl border border-sky-100 bg-white dark:border-sky-900 dark:bg-gray-900">
      {/* Tab header */}
      {tabs.length > 1 && (
        <div className="flex border-b border-sky-100 dark:border-sky-900">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      <div className="p-5">
        {activeTab === 'details' && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[report.status]}`}
              >
                {STATUS_LABELS[report.status]}
              </span>
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                {CATEGORY_LABELS[report.category]}
              </span>
              <SeverityBadge severity={report.severity} />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Dilaporkan</p>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {recordedDate.toLocaleString('id-ID')}
                </p>
              </div>
              {acknowledgedDate && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Diakui</p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {acknowledgedDate.toLocaleString('id-ID')}
                  </p>
                </div>
              )}
            </div>

            {/* Reporter severity indication */}
            {report.reporterSeverity && (
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  Indikasi Pelapor
                </p>
                <SeverityBadge severity={report.reporterSeverity} size="sm" />
              </div>
            )}

            {/* Body text */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Isi Laporan
              </p>
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                {report.bodyRedacted ? (
                  <p className="italic text-gray-400 dark:text-gray-500">
                    [Isi laporan telah diredaksi sesuai kebijakan retensi 3 tahun]
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {report.bodyText}
                  </p>
                )}
              </div>
            </div>

            {/* Public note */}
            {report.publicNote && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
                <p className="mb-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Catatan Publik (terlihat oleh pelapor)
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{report.publicNote}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'internal' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Catatan internal hanya terlihat oleh BLM dan SUPERADMIN.
            </p>
            {report.resolutionNotes ? (
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <p className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Catatan Resolusi
                </p>
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {report.resolutionNotes}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Belum ada catatan internal.
              </p>
            )}
          </div>
        )}

        {activeTab === 'satgas' && showSatgasNotes && (
          <div className="space-y-4">
            <p className="text-xs text-orange-500 dark:text-orange-400">
              Catatan Satgas PPKPT — hanya terlihat oleh Satgas dan SUPERADMIN.
            </p>
            {report.satgasNotes ? (
              <div className="rounded-xl bg-orange-50 p-4 dark:bg-orange-950/20">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {report.satgasNotes}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Belum ada catatan dari Satgas.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

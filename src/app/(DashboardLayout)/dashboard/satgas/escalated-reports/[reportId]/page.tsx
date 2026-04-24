'use client';

/**
 * /dashboard/satgas/escalated-reports/[reportId]
 * NAWASENA M12 — Satgas PPKPT report detail page.
 *
 * Satgas can view full detail + add satgas-only notes.
 * READ access is audited via recordAnonAccess (enforced in API).
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SeverityBadge } from '@/components/anon-report/SeverityBadge';
import { SkeletonCard } from '@/components/shared/skeletons';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { AnonSeverity, AnonStatus, AnonCategory } from '@prisma/client';
import { CheckCircle2, FileText, ShieldAlert, Lock } from 'lucide-react';

const log = createLogger('satgas-anon-report-detail');

interface AnonReportDetail {
  id: string;
  trackingCode: string;
  category: AnonCategory;
  bodyText: string;
  bodyRedacted: boolean;
  severity: AnonSeverity;
  status: AnonStatus;
  satgasEscalated: boolean;
  satgasEscalatedAt?: string | null;
  satgasNotes?: string | null;
  resolutionNotes?: string | null;
  publicNote?: string | null;
  acknowledgedAt?: string | null;
  recordedAt: string;
  closedAt?: string | null;
}

const CATEGORY_LABELS: Record<AnonCategory, string> = {
  BULLYING: 'Perundungan',
  HARASSMENT: 'Pelecehan',
  UNFAIR: 'Ketidakadilan',
  SUGGESTION: 'Saran',
  OTHER: 'Lainnya',
};

const STATUS_LABELS: Record<AnonStatus, string> = {
  NEW: 'Baru',
  IN_REVIEW: 'Sedang Ditinjau',
  RESOLVED: 'Selesai',
  ESCALATED_TO_SATGAS: 'Diteruskan ke Satgas',
};

export default function SatgasReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const router = useRouter();
  const [report, setReport] = useState<AnonReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [satgasNote, setSatgasNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    if (!reportId) return;

    fetch(`/api/anon-reports/${reportId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setReport(data.data);
          setSatgasNote(data.data.satgasNotes ?? '');
        } else {
          toast.error(data.error?.message ?? 'Laporan tidak ditemukan');
          router.push('/dashboard/satgas/escalated-reports');
        }
      })
      .catch((err) => {
        log.error('Failed to load report', { error: err });
        toast.apiError(err);
      })
      .finally(() => setLoading(false));
  }, [reportId, router]);

  const handleSaveSatgasNote = async () => {
    if (!satgasNote.trim()) {
      toast.error('Catatan tidak boleh kosong');
      return;
    }

    setSavingNote(true);
    try {
      const res = await fetch(`/api/anon-reports/${reportId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ satgasNotes: satgasNote }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message);

      toast.success('Catatan Satgas berhasil disimpan');
      setReport((prev) => prev ? { ...prev, satgasNotes: satgasNote } : prev);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleResolve = async () => {
    const ok = await confirm(
      'Tandai laporan selesai?',
      'Laporan akan ditandai sebagai RESOLVED. Tindakan ini tidak dapat dibatalkan.',
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/anon-reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionNote: satgasNote || 'Ditangani oleh Satgas PPKPT ITS.',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message);

      toast.success('Laporan berhasil ditandai selesai');
      setReport((prev) => prev ? { ...prev, status: AnonStatus.RESOLVED, closedAt: new Date().toISOString() } : prev);
    } catch (err) {
      toast.apiError(err);
    }
  };

  if (loading) return <div className="p-6"><SkeletonCard /></div>;
  if (!report) return null;

  return (
    <div className="space-y-6 p-6">
      <DynamicBreadcrumb />
      <ConfirmDialog />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Detail Laporan Diteruskan</h1>
          </div>
          <p className="mt-0.5 font-mono text-sm text-gray-500 dark:text-gray-400">
            {report.trackingCode}
          </p>
        </div>
        <SeverityBadge severity={report.severity} size="md" />
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800 dark:bg-orange-950/20">
        <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
          Status: {STATUS_LABELS[report.status] ?? report.status}
        </span>
        {report.satgasEscalatedAt && (
          <span className="text-xs text-orange-600 dark:text-orange-400">
            · Diteruskan {new Date(report.satgasEscalatedAt).toLocaleString('id-ID')}
          </span>
        )}
      </div>

      {/* Report body */}
      <div className="rounded-2xl border border-sky-100 bg-white p-5 dark:border-sky-900 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-4">
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
            {CATEGORY_LABELS[report.category]}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(report.recordedAt).toLocaleString('id-ID')}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          {report.bodyRedacted ? (
            <span className="italic text-gray-400">[Isi laporan telah diredaksi]</span>
          ) : (
            report.bodyText
          )}
        </p>
      </div>

      {/* Satgas-only notes */}
      <div className="rounded-2xl border border-violet-100 bg-white p-5 dark:border-violet-900 dark:bg-gray-900">
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-violet-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Catatan Internal Satgas
          </h2>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-600 dark:bg-violet-900/50 dark:text-violet-300">
            Hanya terlihat oleh Satgas & SUPERADMIN
          </span>
        </div>

        <textarea
          value={satgasNote}
          onChange={(e) => setSatgasNote(e.target.value)}
          placeholder="Tambahkan catatan penanganan internal..."
          rows={4}
          disabled={report.status === AnonStatus.RESOLVED}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />

        {report.status !== AnonStatus.RESOLVED && (
          <div className="mt-3 flex gap-3">
            <button
              onClick={handleSaveSatgasNote}
              disabled={savingNote}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {savingNote ? 'Menyimpan...' : 'Simpan Catatan'}
            </button>

            <button
              onClick={handleResolve}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Tandai Selesai
            </button>
          </div>
        )}
      </div>

      {/* Resolution notes (from BLM or prior handling) */}
      {report.resolutionNotes && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <p className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Catatan Penyelesaian (BLM)</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{report.resolutionNotes}</p>
        </div>
      )}

      {/* Public note */}
      {report.publicNote && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <p className="mb-1 text-xs font-semibold text-blue-600 dark:text-blue-400">Catatan Publik</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{report.publicNote}</p>
        </div>
      )}

      {/* Resolved badge */}
      {report.status === AnonStatus.RESOLVED && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-green-700 dark:text-green-400">
            Laporan telah diselesaikan
            {report.closedAt && ` pada ${new Date(report.closedAt).toLocaleString('id-ID')}`}
          </span>
        </div>
      )}
    </div>
  );
}

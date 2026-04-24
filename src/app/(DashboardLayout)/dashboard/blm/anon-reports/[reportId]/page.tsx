'use client';

/**
 * /dashboard/blm/anon-reports/[reportId]
 * NAWASENA M12 — BLM report detail page.
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
import { CheckCircle2, ShieldAlert, X } from 'lucide-react';

const log = createLogger('blm-anon-report-detail');

interface AnonReportDetail {
  id: string;
  trackingCode: string;
  category: AnonCategory;
  bodyText: string;
  bodyRedacted: boolean;
  severity: AnonSeverity;
  status: AnonStatus;
  satgasEscalated: boolean;
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

export default function BLMAnonReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const router = useRouter();
  const [report, setReport] = useState<AnonReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    if (!reportId) return;

    fetch(`/api/anon-reports/${reportId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setReport(data.data);
        } else {
          toast.error(data.error?.message ?? 'Laporan tidak ditemukan');
          router.push('/dashboard/blm/anon-reports');
        }
      })
      .catch((err) => {
        log.error('Failed to load report', { error: err });
        toast.apiError(err);
      })
      .finally(() => setLoading(false));
  }, [reportId, router]);

  const handleAcknowledge = async () => {
    const ok = await confirm(
      'Akui laporan ini?',
      'Laporan akan masuk status "Sedang Ditinjau" dan diasosiasikan dengan akun Anda.',
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/anon-reports/${reportId}/acknowledge`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message);

      toast.success('Laporan berhasil diakui');
      setReport((prev) => prev ? { ...prev, status: AnonStatus.IN_REVIEW, acknowledgedAt: new Date().toISOString() } : prev);
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleEscalate = async () => {
    const ok = await confirm(
      'Teruskan ke Satgas PPKPT?',
      'Laporan akan diteruskan ke Satgas PPKPT ITS untuk penanganan lebih lanjut.',
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/anon-reports/${reportId}/escalate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message);

      toast.success('Laporan berhasil diteruskan ke Satgas');
      setReport((prev) => prev ? { ...prev, satgasEscalated: true, status: AnonStatus.ESCALATED_TO_SATGAS } : prev);
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

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Detail Laporan</h1>
          <p className="mt-0.5 text-sm font-mono text-gray-500 dark:text-gray-400">
            {report.trackingCode}
          </p>
        </div>
        <SeverityBadge severity={report.severity} size="md" />
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

      {/* Action bar */}
      {report.status === AnonStatus.NEW && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleAcknowledge}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600"
          >
            <CheckCircle2 className="h-4 w-4" />
            Akui Laporan
          </button>
          {!report.satgasEscalated && (
            <button
              onClick={handleEscalate}
              className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-400"
            >
              <ShieldAlert className="h-4 w-4" />
              Teruskan ke Satgas
            </button>
          )}
        </div>
      )}

      {report.status === AnonStatus.IN_REVIEW && !report.satgasEscalated && (
        <button
          onClick={handleEscalate}
          className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-400"
        >
          <ShieldAlert className="h-4 w-4" />
          Teruskan ke Satgas
        </button>
      )}

      {/* Public note */}
      {report.publicNote && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <p className="mb-1 text-xs font-semibold text-blue-600 dark:text-blue-400">Catatan Publik</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{report.publicNote}</p>
        </div>
      )}
    </div>
  );
}

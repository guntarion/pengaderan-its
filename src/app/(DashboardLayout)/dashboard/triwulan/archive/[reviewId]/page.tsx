'use client';

/**
 * src/app/(DashboardLayout)/dashboard/triwulan/archive/[reviewId]/page.tsx
 * NAWASENA M14 — Archive detail: read-only finalized review.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ReviewStatusBadge } from '@/components/triwulan/ReviewStatusBadge';
import { EscalationFlagBanner } from '@/components/triwulan/EscalationFlagBanner';
import { SnapshotKPITable } from '@/components/triwulan/SnapshotKPITable';
import { SnapshotKirkpatrickSection } from '@/components/triwulan/SnapshotKirkpatrickSection';
import { SnapshotIncidentSummary } from '@/components/triwulan/SnapshotIncidentSummary';
import { AuditSubstansiChecklist } from '@/components/triwulan/AuditSubstansiChecklist';
import { SignatureChainTimeline } from '@/components/triwulan/SignatureChainTimeline';
import { PDFDownloadButton } from '@/components/triwulan/PDFDownloadButton';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Archive, FileText, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { ReviewStatus, TriwulanEscalationLevel, EscalationRuleKey, PDFStatus, MuatanCoverageStatus } from '@prisma/client';

const log = createLogger('m14/archive/detail');
const QUARTER_LABELS = ['', 'Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV'];

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-sky-500" />
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

interface ReviewDetail {
  id: string;
  quarterNumber: number;
  status: ReviewStatus;
  escalationLevel: TriwulanEscalationLevel;
  pdfStatus: PDFStatus;
  executiveSummary: string | null;
  blmAcknowledgedAt: string | null;
  dataSnapshotJsonb: Record<string, unknown>;
  cohort: { code: string; name: string };
  auditSubstansiResults: Array<{
    id: string;
    itemKey: string;
    coverage: MuatanCoverageStatus;
    evidenceRef: string | null;
    notes: string | null;
    assessedAt: string | null;
    assessedBy: { displayName: string | null; fullName: string | null } | null;
  }>;
  signatureEvents: Array<{
    id: string;
    action: string;
    notes: string | null;
    timestamp: string;
    actor: { displayName: string | null; fullName: string | null } | null;
  }>;
}

export default function ArchiveDetailPage() {
  const params = useParams<{ reviewId: string }>();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReview = useCallback(async () => {
    setLoading(true);
    try {
      log.info('Fetching archive review detail', { reviewId: params.reviewId });
      const res = await fetch(`/api/triwulan/${params.reviewId}`);
      if (!res.ok) {
        const data = await res.json();
        toast.apiError(data);
        return;
      }
      const data = await res.json();
      setReview(data.data);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [params.reviewId]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 h-28" />
        <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!review) return null;

  const snap = review.dataSnapshotJsonb ?? {};
  const escalationFlags = (snap.escalationFlags as EscalationRuleKey[]) ?? [];

  const auditItems = review.auditSubstansiResults.map((r) => ({
    key: r.itemKey as import('@prisma/client').MuatanWajibKey,
    label: r.itemKey.replace(/_/g, ' '),
    description: '',
    result: {
      id: r.id,
      coverage: r.coverage,
      evidenceRef: r.evidenceRef,
      notes: r.notes,
      assessedAt: r.assessedAt,
      assessedBy: r.assessedBy,
    },
  }));

  const signatureEventsForTimeline = review.signatureEvents.map((e) => ({
    id: e.id,
    action: e.action,
    actorDisplayName: e.actor?.displayName ?? null,
    actorFullName: e.actor?.fullName ?? null,
    notes: e.notes,
    createdAt: e.timestamp,
  }));

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
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Archive className="h-6 w-6" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">
                    {QUARTER_LABELS[review.quarterNumber]} — {review.cohort.code}
                  </h1>
                  <ReviewStatusBadge status={review.status} className="border border-white/30" />
                </div>
                <p className="text-sm text-white/70">{review.cohort.name}</p>
              </div>
            </div>
            <PDFDownloadButton reviewId={review.id} initialPdfStatus={review.pdfStatus} />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {escalationFlags.length > 0 && (
          <EscalationFlagBanner level={review.escalationLevel} flags={escalationFlags} />
        )}

        {/* Executive summary */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">
            Narasi Eksekutif
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {review.executiveSummary || '(Tidak ada narasi)'}
          </p>
        </div>

        {/* KPI */}
        <CollapsibleSection title="Data KPI" icon={FileText} defaultOpen>
          <SnapshotKPITable kpiData={snap.kpi as Record<string, unknown> | null} />
        </CollapsibleSection>

        {/* Kirkpatrick */}
        <CollapsibleSection title="Evaluasi Kirkpatrick" icon={FileText}>
          <SnapshotKirkpatrickSection
            kirkpatrickData={snap.kirkpatrick as Record<string, unknown> | null}
          />
        </CollapsibleSection>

        {/* Incidents */}
        <CollapsibleSection title="Insiden & Keamanan" icon={AlertTriangle}>
          <SnapshotIncidentSummary
            incidentsData={snap.incidents as Record<string, unknown> | null}
            redFlagsData={snap.redFlags as Record<string, unknown> | null}
            anonData={snap.anonReports as Record<string, unknown> | null}
            forbiddenActsData={snap.forbiddenActs as Record<string, unknown> | null}
          />
        </CollapsibleSection>

        {/* Audit substansi */}
        {auditItems.length > 0 && (
          <CollapsibleSection title="Audit Substansi (10 Muatan Wajib)" icon={FileText}>
            <AuditSubstansiChecklist
              reviewId={review.id}
              items={auditItems}
              readonly
            />
          </CollapsibleSection>
        )}

        {/* Signature chain */}
        <CollapsibleSection title="Jejak Tanda Tangan" icon={FileText}>
          <SignatureChainTimeline events={signatureEventsForTimeline} />
        </CollapsibleSection>
      </div>
    </div>
  );
}

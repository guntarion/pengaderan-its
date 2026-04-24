'use client';

/**
 * src/app/(DashboardLayout)/dashboard/sc/triwulan/[reviewId]/page.tsx
 * NAWASENA M14 — SC: Triwulan Review Detail + Edit Draft + Submit.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ReviewStatusBadge } from '@/components/triwulan/ReviewStatusBadge';
import { EscalationFlagBanner } from '@/components/triwulan/EscalationFlagBanner';
import { SnapshotKPITable } from '@/components/triwulan/SnapshotKPITable';
import { SnapshotKirkpatrickSection } from '@/components/triwulan/SnapshotKirkpatrickSection';
import { SnapshotIncidentSummary } from '@/components/triwulan/SnapshotIncidentSummary';
import { NarrativeEditor } from '@/components/triwulan/NarrativeEditor';
import { SignatureChainTimeline } from '@/components/triwulan/SignatureChainTimeline';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import {
  FileText,
  Send,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReviewStatus, TriwulanEscalationLevel, EscalationRuleKey } from '@prisma/client';

const log = createLogger('m14/sc/triwulan/detail');
const QUARTER_LABELS = ['', 'Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV'];

interface ReviewDetail {
  id: string;
  quarterNumber: number;
  status: ReviewStatus;
  escalationLevel: TriwulanEscalationLevel;
  executiveSummary: string | null;
  submittedAt: string | null;
  supersededByReviewId: string | null;
  generatedAt: string | null;
  dataSnapshotJsonb: Record<string, unknown>;
  cohort: { id: string; code: string; name: string };
  signatureEvents: {
    id: string;
    action: string;
    notes: string | null;
    timestamp: string;
    actor: { displayName: string | null; fullName: string | null } | null;
  }[];
}

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
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export default function SCReviewDetailPage() {
  const params = useParams<{ reviewId: string }>();
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchReview = useCallback(async () => {
    setLoading(true);
    try {
      log.info('Fetching review detail', { reviewId: params.reviewId });
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

  const handleSubmit = async () => {
    if (!review) return;

    const narrativeLen = (review.executiveSummary?.trim() ?? '').length;
    if (narrativeLen < 200) {
      toast.error('Narasi harus minimal 200 karakter sebelum dapat dikirim ke Pembina');
      return;
    }

    const ok = await confirm(
      'Kirim ke Pembina?',
      'Review akan dikirim ke Pembina untuk ditandatangani. Pastikan narasi sudah lengkap dan akurat.'
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/triwulan/${params.reviewId}/submit`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        toast.apiError(data);
        return;
      }
      toast.success('Review berhasil dikirim ke Pembina');
      router.push('/dashboard/sc/triwulan');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSubmitting(false);
    }
  };

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
  const isDraft = review.status === ReviewStatus.DRAFT;
  const isSuperseded = !!review.supersededByReviewId;

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
              <FileText className="h-6 w-6" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">
                    {QUARTER_LABELS[review.quarterNumber]} — {review.cohort.code}
                  </h1>
                  <ReviewStatusBadge
                    status={review.status}
                    className="border border-white/30"
                  />
                </div>
                <p className="text-sm text-white/70">{review.cohort.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Superseded warning */}
        {isSuperseded && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Review ini telah digantikan oleh versi revisi yang lebih baru.
            </p>
          </div>
        )}

        {/* Escalation flags */}
        {escalationFlags.length > 0 && (
          <EscalationFlagBanner
            level={review.escalationLevel}
            flags={escalationFlags}
          />
        )}

        {/* Mid-quarter warning */}
        {Boolean(snap.generatedMidQuarter) && (
          <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Review ini dibuat di tengah triwulan. Data mungkin belum mencerminkan seluruh
              periode triwulan.
            </p>
          </div>
        )}

        {/* Data partial warning */}
        {Boolean(snap.dataPartial) && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Beberapa sumber data tidak tersedia:{' '}
              {((snap.missingSources as string[]) ?? []).join(', ') || 'tidak diketahui'}.
            </p>
          </div>
        )}

        {/* Narrative editor */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">
            Narasi Eksekutif
          </h2>
          <NarrativeEditor
            reviewId={params.reviewId}
            initialNarrative={review.executiveSummary ?? ''}
            readonly={!isDraft || isSuperseded}
            onSaved={(narrative) =>
              setReview((prev) =>
                prev ? { ...prev, executiveSummary: narrative } : prev
              )
            }
          />
        </div>

        {/* KPI */}
        <CollapsibleSection title="Data KPI" icon={FileText} defaultOpen={true}>
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

        {/* Signature timeline */}
        <CollapsibleSection title="Jejak Tanda Tangan" icon={FileText}>
          <SignatureChainTimeline events={signatureEventsForTimeline} />
        </CollapsibleSection>

        {/* Submit button */}
        {isDraft && !isSuperseded && (
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white px-6"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengirim...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Kirim ke Pembina
                </span>
              )}
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog />
    </div>
  );
}

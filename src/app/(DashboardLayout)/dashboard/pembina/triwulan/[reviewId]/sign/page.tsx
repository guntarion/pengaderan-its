'use client';

/**
 * src/app/(DashboardLayout)/dashboard/pembina/triwulan/[reviewId]/sign/page.tsx
 * NAWASENA M14 — Pembina: Review detail + sign / request revision.
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
import { SignConfirmDialog } from '@/components/triwulan/SignConfirmDialog';
import { RevisionReasonDialog } from '@/components/triwulan/RevisionReasonDialog';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import {
  FileText,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReviewStatus, TriwulanEscalationLevel, EscalationRuleKey } from '@prisma/client';

const log = createLogger('m14/pembina/triwulan/sign');
const QUARTER_LABELS = ['', 'Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV'];

interface ReviewDetail {
  id: string;
  quarterNumber: number;
  status: ReviewStatus;
  escalationLevel: TriwulanEscalationLevel;
  executiveSummary: string | null;
  submittedAt: string | null;
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
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export default function PembinaSignPage() {
  const params = useParams<{ reviewId: string }>();
  const router = useRouter();

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);

  const fetchReview = useCallback(async () => {
    setLoading(true);
    try {
      log.info('Fetching review for Pembina sign', { reviewId: params.reviewId });
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

  const handleSign = async (notes: string, inPersonReviewed: boolean) => {
    const res = await fetch(`/api/triwulan/${params.reviewId}/pembina-sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, inPersonReviewed }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.apiError(data);
      throw new Error('Sign failed');
    }
    toast.success('Review berhasil ditandatangani');
    router.push('/dashboard/pembina/triwulan');
  };

  const handleRevision = async (reason: string) => {
    const res = await fetch(`/api/triwulan/${params.reviewId}/pembina-request-revision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.apiError(data);
      throw new Error('Revision request failed');
    }
    toast.success('Permintaan revisi berhasil dikirim ke SC');
    router.push('/dashboard/pembina/triwulan');
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
  const canAct = review.status === ReviewStatus.SUBMITTED_FOR_PEMBINA;

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
                  <ReviewStatusBadge status={review.status} className="border border-white/30" />
                </div>
                <p className="text-sm text-white/70">{review.cohort.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Escalation */}
        {escalationFlags.length > 0 && (
          <EscalationFlagBanner
            level={review.escalationLevel}
            flags={escalationFlags}
          />
        )}

        {/* Narrative (read-only) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">
            Narasi Eksekutif SC
          </h2>
          <NarrativeEditor
            reviewId={params.reviewId}
            initialNarrative={review.executiveSummary ?? ''}
            readonly
          />
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

        {/* Signature chain */}
        <CollapsibleSection title="Jejak Tanda Tangan" icon={FileText}>
          <SignatureChainTimeline events={signatureEventsForTimeline} />
        </CollapsibleSection>

        {/* Actions */}
        {canAct && (
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRevisionDialog(true)}
              className="rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Minta Revisi
            </Button>
            <Button
              type="button"
              onClick={() => setShowSignDialog(true)}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Tanda Tangani
            </Button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {review && (
        <>
          <SignConfirmDialog
            open={showSignDialog}
            onClose={() => setShowSignDialog(false)}
            onConfirm={handleSign}
            escalationLevel={review.escalationLevel}
          />
          <RevisionReasonDialog
            open={showRevisionDialog}
            onClose={() => setShowRevisionDialog(false)}
            onConfirm={handleRevision}
            title="Minta Revisi ke SC"
            description="Berikan alasan yang jelas mengapa review ini perlu direvisi oleh SC."
          />
        </>
      )}
    </div>
  );
}

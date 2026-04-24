'use client';

/**
 * /dashboard/kakak-c/request/[id]
 * MABA — status tracker pengajuan pergantian Kakak Asuh.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { ArrowLeft, CheckCircle, Clock, XCircle, Heart } from 'lucide-react';
import { STRUKTUR_COPY } from '@/i18n/struktur-copy';

const log = createLogger('kakak-c-request-detail');

interface KasuhUser {
  id: string;
  fullName: string;
  displayName?: string | null;
  nrp?: string | null;
  role: string;
  province?: string | null;
  interests?: string[] | null;
}

interface PairingRequest {
  id: string;
  type: string;
  status: string;
  optionalNote: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  cohort: { id: string; code: string; name: string };
  requester: { id: string; fullName: string; displayName: string | null };
  resolver: { id: string; fullName: string; displayName: string | null } | null;
  currentKasuhPair: {
    id: string;
    kasuh: KasuhUser;
  } | null;
  fulfilledKasuhPair: {
    id: string;
    kasuh: KasuhUser;
  } | null;
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'FULFILLED': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    case 'APPROVED': return <CheckCircle className="h-5 w-5 text-sky-500" />;
    case 'REJECTED': return <XCircle className="h-5 w-5 text-red-500" />;
    case 'PENDING': return <Clock className="h-5 w-5 text-amber-500" />;
    default: return <Clock className="h-5 w-5 text-gray-400" />;
  }
};

const statusColor = (s: string) => {
  switch (s) {
    case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'APPROVED': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'FULFILLED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
    case 'CANCELLED': return 'bg-gray-100 text-gray-700 border-gray-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function PairingRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<PairingRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequest() {
      try {
        log.info('Fetching pairing request detail', { requestId: params.id });
        const res = await fetch(`/api/pairing/request/${params.id}`);
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setRequest(json.data);
      } catch (err) {
        log.error('Failed to fetch request detail', { err });
        toast.error('Gagal memuat data pengajuan');
      } finally {
        setLoading(false);
      }
    }
    fetchRequest();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <SkeletonCard />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-8 text-center">
          <p className="text-red-700 dark:text-red-300 text-sm">Pengajuan tidak ditemukan.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb labels={{ [params.id]: `Pengajuan ${request.id.slice(-6).toUpperCase()}` }} />

      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </button>

      {/* Status Card */}
      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-sky-500 to-blue-600">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{STRUKTUR_COPY.typeLabels[request.type] ?? request.type}</p>
            <Badge className={`text-xs ${statusColor(request.status)}`}>
              {STRUKTUR_COPY.statusLabels[request.status] ?? request.status}
            </Badge>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Timeline */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Perjalanan Pengajuan</h2>
            <div className="relative pl-6 space-y-4">
              {/* Submitted */}
              <div className="flex items-start gap-3">
                <div className="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/30">
                  <Clock className="h-3.5 w-3.5 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{STRUKTUR_COPY.timelineSubmitted}</p>
                  <p className="text-xs text-gray-400">{formatDate(request.createdAt)}</p>
                </div>
              </div>

              {/* Resolved */}
              {request.resolvedAt && (
                <div className="flex items-start gap-3">
                  <div className="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/30">
                    {statusIcon(request.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {request.status === 'FULFILLED'
                        ? STRUKTUR_COPY.timelineFulfilled
                        : request.status === 'APPROVED'
                          ? STRUKTUR_COPY.timelineApproved
                          : STRUKTUR_COPY.timelineRejected}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(request.resolvedAt)}</p>
                    {request.resolver && (
                      <p className="text-xs text-gray-400">
                        Oleh: {request.resolver.displayName ?? request.resolver.fullName}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resolution note */}
          {request.resolutionNote && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xs font-medium text-gray-500 mb-1">Catatan dari SC</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{request.resolutionNote}</p>
            </div>
          )}

          {/* Fulfilled — show new Kasuh */}
          {request.status === 'FULFILLED' && request.fulfilledKasuhPair && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Kakak Asuh Baru Anda</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {(request.fulfilledKasuhPair.kasuh.displayName ?? request.fulfilledKasuhPair.kasuh.fullName).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {request.fulfilledKasuhPair.kasuh.displayName ?? request.fulfilledKasuhPair.kasuh.fullName}
                  </p>
                  {request.fulfilledKasuhPair.kasuh.province && (
                    <p className="text-xs text-gray-400">{request.fulfilledKasuhPair.kasuh.province}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Your note */}
          {request.optionalNote && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Catatan yang kamu kirim</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">{request.optionalNote}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

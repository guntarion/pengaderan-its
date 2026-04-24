'use client';

/**
 * /dashboard/kakak-c/request
 * MABA — ajukan pergantian Kakak Asuh.
 * Copy lock: DO NOT change button/label text without UX + BLM review.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormWrapper, FormTextarea } from '@/components/shared/FormWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { ClipboardList, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { STRUKTUR_COPY } from '@/i18n/struktur-copy';
import { z } from 'zod';

const log = createLogger('kakak-c-request-page');

const requestSchema = z.object({
  optionalNote: z.string().max(1000).optional(),
});
type RequestFormData = z.infer<typeof requestSchema>;

interface KasuhPairInfo {
  pairId: string;
  kasuh: {
    id: string;
    fullName: string;
    displayName?: string | null;
  };
  cohort: { id: string; code: string; name: string };
}

interface PastRequest {
  id: string;
  type: string;
  status: string;
  createdAt: string;
}

export default function KakakCRequestPage() {
  const router = useRouter();
  const [kasuhPair, setKasuhPair] = useState<KasuhPairInfo | null>(null);
  const [pastRequests] = useState<PastRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [canRequest, setCanRequest] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        log.info('Fetching MABA relasi data for request form');
        const res = await fetch('/api/pairing/my-relations');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        const data = json.data;

        if (data?.kasuhPair) {
          setKasuhPair(data.kasuhPair);
          setCanRequest(true);
          setLimitReason(null);
        } else {
          setCanRequest(false);
          setLimitReason(STRUKTUR_COPY.noActiveKasuh);
        }
      } catch (err) {
        log.error('Failed to fetch relasi for request form', { err });
        toast.error('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          {/* DO NOT CHANGE — copy lock */}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{STRUKTUR_COPY.formTitle}</h1>
          <p className="text-sm text-gray-500">{STRUKTUR_COPY.formDescription}</p>
        </div>
      </div>

      {!canRequest ? (
        <Alert className="border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            {limitReason}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Current Kasuh info */}
          {kasuhPair && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Kakak Asuh Saat Ini</p>
              </div>
              <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
                {kasuhPair.kasuh.displayName ?? kasuhPair.kasuh.fullName}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">
                Kohort: {kasuhPair.cohort.name}
              </p>
            </div>
          )}

          {/* Form */}
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <FormWrapper<RequestFormData>
              schema={requestSchema}
              defaultValues={{ optionalNote: '' }}
              onSubmit={async (formData) => {
                if (!kasuhPair) return;
                const res = await fetch('/api/pairing/request', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'RE_PAIR_KASUH',
                    currentKasuhPairId: kasuhPair.pairId,
                    optionalNote: formData.optionalNote || undefined,
                  }),
                });
                if (!res.ok) throw await res.json();
                const result = await res.json();
                toast.success('Pengajuan berhasil dikirim');
                router.push(`/dashboard/kakak-c/request/${result.data.id}`);
              }}
              submitLabel={STRUKTUR_COPY.submitLabel}
              onCancel={() => router.back()}
            >
              {({ control }) => (
                <FormTextarea
                  control={control}
                  name="optionalNote"
                  label={STRUKTUR_COPY.noteLabel}
                  placeholder={STRUKTUR_COPY.notePlaceholder}
                  description="Opsional. SC dapat melihat catatan ini."
                />
              )}
            </FormWrapper>
          </div>

          {/* Past requests */}
          {pastRequests.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Riwayat Pengajuan</h2>
              {pastRequests.map((req) => (
                <button
                  key={req.id}
                  onClick={() => router.push(`/dashboard/kakak-c/request/${req.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-700 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {STRUKTUR_COPY.typeLabels[req.type] ?? req.type}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(req.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs">
                      {STRUKTUR_COPY.statusLabels[req.status] ?? req.status}
                    </Badge>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

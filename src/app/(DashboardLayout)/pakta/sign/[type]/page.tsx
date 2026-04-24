'use client';

/**
 * /pakta/sign/[type]
 * Pakta signing — Step 1: Read document + 3 acknowledgment checkboxes.
 *
 * Query params:
 *   versionId — PaktaVersion ID to sign (fetched from server if not provided)
 *
 * On confirm → navigate to quiz page.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PaktaReader } from '@/components/pakta/PaktaReader';
import { PaktaCheckboxConfirm } from '@/components/pakta/PaktaCheckboxConfirm';
import { SkeletonPageHeader, SkeletonText } from '@/components/shared/skeletons';
import { FileSignature } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('pakta-sign-page');

type PaktaType = 'PAKTA_PANITIA' | 'SOCIAL_CONTRACT_MABA' | 'PAKTA_PENGADER_2027';

const TYPE_LABELS: Record<PaktaType, string> = {
  PAKTA_PANITIA: 'Pakta Panitia',
  SOCIAL_CONTRACT_MABA: 'Social Contract MABA',
  PAKTA_PENGADER_2027: 'Pakta Pengader 2027',
};

interface PaktaVersionData {
  id: string;
  type: PaktaType;
  title: string;
  contentMarkdown: string;
  versionNumber: number;
  passingScore: number;
}

export default function PaktaSignPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = params.type as PaktaType;

  const [version, setVersion] = useState<PaktaVersionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reachBottom, setReachBottom] = useState(false);

  useEffect(() => {
    async function fetchVersion() {
      try {
        const versionId = searchParams.get('versionId');
        const url = versionId
          ? `/api/pakta/current?type=${encodeURIComponent(type)}&versionId=${versionId}`
          : `/api/pakta/current?type=${encodeURIComponent(type)}`;

        const res = await fetch(url);
        if (!res.ok) {
          const json = await res.json();
          toast.apiError(json);
          return;
        }
        const json = await res.json();
        setVersion(json.data);
      } catch (err) {
        toast.error('Gagal memuat dokumen pakta');
        log.error('Failed to load pakta version', { error: err, type });
      } finally {
        setIsLoading(false);
      }
    }
    fetchVersion();
  }, [type, searchParams]);

  const handleConfirmed = () => {
    if (!version) return;
    // Navigate to quiz page with versionId in URL
    router.push(
      `/pakta/sign/${type}/quiz?versionId=${version.id}&passingScore=${version.passingScore}`
    );
  };

  const typedType = type as PaktaType;
  const label = TYPE_LABELS[typedType] ?? type;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <SkeletonPageHeader />
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5">
            <SkeletonText lines={20} />
          </div>
        </div>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 p-6 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">Dokumen pakta tidak tersedia</p>
          <p className="text-sm mt-1">Hubungi SC untuk informasi lebih lanjut.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <FileSignature className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{label}</h1>
              <p className="text-sm text-sky-100 mt-0.5">
                {version.title} · Versi {version.versionNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400">
            <span className="h-5 w-5 rounded-full bg-sky-500 text-white text-xs flex items-center justify-center">1</span>
            Baca Dokumen
          </div>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs flex items-center justify-center">2</span>
            Post-Test
          </div>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs flex items-center justify-center">3</span>
            Konfirmasi
          </div>
        </div>

        {/* Document reader */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <PaktaReader
            contentMarkdown={version.contentMarkdown}
            onReachBottom={() => setReachBottom(true)}
            reachBottom={reachBottom}
          />
        </div>

        {/* Checkbox confirmation */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Pernyataan Kesanggupan
          </h2>
          <PaktaCheckboxConfirm
            reachBottom={reachBottom}
            onConfirmed={handleConfirmed}
          />
        </div>

        {/* Reject option */}
        <div className="text-center">
          <button
            className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors underline underline-offset-2"
            onClick={() => router.push(`/pakta/sign/${type}/reject?versionId=${version.id}`)}
          >
            Saya tidak dapat menyetujui pakta ini
          </button>
        </div>
      </div>
    </div>
  );
}

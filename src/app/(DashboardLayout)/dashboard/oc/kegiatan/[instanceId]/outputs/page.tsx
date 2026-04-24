'use client';

/**
 * src/app/(DashboardLayout)/dashboard/oc/kegiatan/[instanceId]/outputs/page.tsx
 * NAWASENA M08 — Output upload management page.
 */

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { OutputCard } from '@/components/event-execution/OutputCard';
import { OutputUploader } from '@/components/event-execution/OutputUploader';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { ChevronLeftIcon, PackageOpenIcon, PlusCircleIcon } from 'lucide-react';

interface OutputItem {
  id: string;
  type: 'FILE' | 'LINK' | 'VIDEO' | 'REPO';
  url: string;
  caption: string;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  scanStatus: string;
  uploadedAt: string;
  uploader: { id: string; fullName: string };
}

export default function OutputsPage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const { instanceId } = use(params);
  const { data: session } = useSession();
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  const fetchOutputs = useCallback(async () => {
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/outputs`);
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      setOutputs(data.data ?? []);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchOutputs();
  }, [fetchOutputs]);

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
          <Link
            href={`/dashboard/oc/kegiatan/${instanceId}`}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Kembali ke detail kegiatan
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PackageOpenIcon className="h-6 w-6" />
              <h1 className="text-xl font-bold">Output Kegiatan</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowUploader((v) => !v)}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-colors border border-white/30"
            >
              <PlusCircleIcon className="h-4 w-4" />
              Tambah Output
            </button>
          </div>
          <p className="text-sm text-white/80 mt-1">
            File, link, video, dan repository dari kegiatan ini
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-5">
        {/* Uploader form */}
        {showUploader && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Tambah Output Baru
            </h2>
            <OutputUploader
              instanceId={instanceId}
              onSuccess={() => {
                setShowUploader(false);
                fetchOutputs();
              }}
            />
          </div>
        )}

        {/* Output list */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Daftar Output ({outputs.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : outputs.length === 0 ? (
            <div className="text-center py-8">
              <PackageOpenIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Belum ada output. Tambah file, link, video, atau repository.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {outputs.map((output) => (
                <OutputCard
                  key={output.id}
                  instanceId={instanceId}
                  output={output}
                  currentUserId={session?.user?.id ?? ''}
                  userRole={(session?.user as { role?: string })?.role ?? ''}
                  onDelete={fetchOutputs}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

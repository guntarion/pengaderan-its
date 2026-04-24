'use client';

/**
 * /admin/pakta
 * SC admin — list pakta versions per type.
 * Roles: SC, SUPERADMIN, PEMBINA, BLM
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Users } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin-pakta-page');

type PaktaVersionStatus = 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';

interface PaktaVersion {
  id: string;
  type: string;
  versionNumber: number;
  title: string;
  status: PaktaVersionStatus;
  passingScore: number;
  publishedAt: string | null;
  effectiveFrom: string;
  _count: { signatures: number };
}

const STATUS_BADGE: Record<PaktaVersionStatus, { label: string; class: string }> = {
  DRAFT: { label: 'Draft', class: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
  PUBLISHED: { label: 'Aktif', class: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  SUPERSEDED: { label: 'Diganti', class: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
};

const TYPE_LABELS: Record<string, string> = {
  PAKTA_PANITIA: 'Pakta Panitia',
  SOCIAL_CONTRACT_MABA: 'Social Contract MABA',
  PAKTA_PENGADER_2027: 'Pakta Pengader 2027',
};

export default function AdminPaktaPage() {
  const router = useRouter();
  const [versions, setVersions] = useState<PaktaVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await fetch('/api/admin/pakta/versions');
        if (!res.ok) {
          const json = await res.json();
          toast.apiError(json);
          return;
        }
        const json = await res.json();
        setVersions(json.data ?? []);
      } catch (err) {
        toast.error('Gagal memuat daftar versi pakta');
        log.error('Fetch error', { error: err });
      } finally {
        setIsLoading(false);
      }
    }
    fetchVersions();
  }, []);

  // Group by type
  const grouped = versions.reduce<Record<string, PaktaVersion[]>>((acc, v) => {
    if (!acc[v.type]) acc[v.type] = [];
    acc[v.type].push(v);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2.5">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Manajemen Pakta</h1>
                <p className="text-sm text-sky-100 mt-0.5">
                  Kelola versi pakta dan lihat signers
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/admin/pakta/new')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-2 bg-transparent border"
            >
              <Plus className="h-4 w-4" />
              Terbitkan Versi Baru
            </Button>
          </div>
        </div>

        {isLoading ? (
          <SkeletonTable rows={5} columns={4} />
        ) : Object.keys(grouped).length === 0 ? (
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Belum ada versi pakta</p>
            <Button
              onClick={() => router.push('/admin/pakta/new')}
              className="mt-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white"
            >
              Terbitkan Pakta Pertama
            </Button>
          </div>
        ) : (
          Object.entries(grouped).map(([type, typeVersions]) => (
            <div
              key={type}
              className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-sky-100 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/20">
                <h2 className="text-sm font-semibold text-sky-700 dark:text-sky-300">
                  {TYPE_LABELS[type] ?? type}
                </h2>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {typeVersions.map((v) => {
                  const statusBadge = STATUS_BADGE[v.status];
                  return (
                    <div
                      key={v.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-sky-50 dark:hover:bg-sky-950/10 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                            v{v.versionNumber} — {v.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs flex-shrink-0 ${statusBadge.class}`}
                          >
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {v._count.signatures} penanda tangan
                          </span>
                          <span>Passing score: {v.passingScore}%</span>
                          {v.publishedAt && (
                            <span>
                              Diterbitkan: {new Date(v.publishedAt).toLocaleDateString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

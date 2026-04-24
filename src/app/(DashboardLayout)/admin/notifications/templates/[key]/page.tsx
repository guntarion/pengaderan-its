'use client';

/**
 * /admin/notifications/templates/[key] — Template detail + version list
 * Roles: SC, SUPERADMIN
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { ArrowLeft, Plus, Globe, Building2, CheckCircle } from 'lucide-react';

const log = createLogger('admin-template-detail');

interface TemplateVersion {
  id: string;
  version: string;
  format: string;
  publishedAt: string | null;
  createdAt: string;
  createdBy: { fullName: string } | null;
}

interface TemplateDetail {
  id: string;
  templateKey: string;
  description: string;
  category: string;
  organizationId: string | null;
  supportedChannels: string[];
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  versions: TemplateVersion[];
  activeVersion: { id: string; version: string; publishedAt: string | null } | null;
}

const categoryColor = (c: string) => {
  switch (c) {
    case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
    case 'FORM_REMINDER': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'NORMAL': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'OPS': return 'bg-violet-100 text-violet-800 border-violet-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const key = params.key as string;

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplate() {
      try {
        log.info('Fetching template detail', { key });
        const res = await fetch(`/api/notifications/admin/templates/${key}`);
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        // API returns { orgTemplate, globalTemplate, effectiveTemplate }
        setTemplate(json.data.effectiveTemplate ?? json.data);
      } catch (err) {
        log.error('Failed to fetch template', { err, key });
        toast.error('Gagal memuat detail template');
      } finally {
        setLoading(false);
      }
    }
    fetchTemplate();
  }, [key]);

  if (loading) return <SkeletonTable rows={4} />;
  if (!template) return <div className="text-gray-500">Template tidak ditemukan.</div>;

  return (
    <div className="space-y-6">
      <DynamicBreadcrumb labels={{ [key]: template.templateKey }} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 text-gray-500 hover:text-gray-700"
            onClick={() => router.push('/admin/notifications/templates')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali
          </Button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono">
            {template.templateKey}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{template.description}</p>
        </div>
        <Button
          className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
          onClick={() => router.push(`/admin/notifications/templates/${key}/versions/new`)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Versi Baru
        </Button>
      </div>

      {/* Template info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Info Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Kategori</span>
              <Badge className={`text-xs border ${categoryColor(template.category)}`}>
                {template.category}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Cakupan</span>
              <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                {template.organizationId === null ? (
                  <><Globe className="h-3.5 w-3.5 text-violet-500" /> Global</>
                ) : (
                  <><Building2 className="h-3.5 w-3.5 text-sky-500" /> Org</>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Channel</span>
              <div className="flex gap-1 flex-wrap">
                {template.supportedChannels.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Versi Aktif</span>
              {template.activeVersion ? (
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  v{template.activeVersion.version}
                </span>
              ) : (
                <span className="text-xs text-red-500">Belum ada versi aktif</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Versi</span>
              <span className="text-gray-700 dark:text-gray-300">{template.versions.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Active version quick info */}
        {template.activeVersion && (
          <Card className="rounded-2xl border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Versi Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                v{template.activeVersion.version}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                Diterbitkan{' '}
                {template.activeVersion.publishedAt
                  ? new Date(template.activeVersion.publishedAt).toLocaleDateString('id-ID', { dateStyle: 'long' })
                  : 'tanggal tidak diketahui'
                }
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                onClick={() => router.push(
                  `/admin/notifications/templates/${key}/versions/${template.activeVersion!.id}`,
                )}
              >
                Lihat Detail
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Version history */}
      <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Riwayat Versi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {template.versions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">Belum ada versi. Buat versi pertama.</p>
              <Button
                size="sm"
                className="mt-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
                onClick={() => router.push(`/admin/notifications/templates/${key}/versions/new`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Buat Versi Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {template.versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border border-transparent hover:border-sky-100 dark:hover:border-sky-900 transition-colors"
                  onClick={() => router.push(`/admin/notifications/templates/${key}/versions/${v.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
                        v{v.version}
                      </span>
                      {template.activeVersionId === v.id && (
                        <Badge className="ml-2 text-xs bg-emerald-100 text-emerald-800 border-emerald-300 border">
                          Aktif
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {v.format}
                      {v.createdBy && <span className="ml-2">oleh {v.createdBy.fullName}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    {v.publishedAt ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        Diterbitkan {new Date(v.publishedAt).toLocaleDateString('id-ID')}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400">Draft</span>
                    )}
                    <div className="text-xs text-gray-400">
                      {new Date(v.createdAt).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

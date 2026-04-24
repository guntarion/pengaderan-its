'use client';

/**
 * /admin/notifications/templates/[key]/versions/[versionId] — View/edit template version
 * Roles: SC, SUPERADMIN
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonForm } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { TemplateVersionEditor, type TemplateVersionData } from '@/components/notifications/TemplateVersionEditor';

const log = createLogger('admin-template-version-page');

export default function TemplateVersionPage() {
  const params = useParams();
  const key = params.key as string;
  const versionId = params.versionId as string;

  const [versionData, setVersionData] = useState<TemplateVersionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVersion() {
      try {
        log.info('Fetching template version', { key, versionId });
        // Fetch from template key route which includes versions
        const res = await fetch(`/api/notifications/admin/templates/${key}`);
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        // API returns { orgTemplate, globalTemplate, effectiveTemplate }
        const effectiveTemplate = json.data.effectiveTemplate ?? json.data;
        const version = effectiveTemplate?.versions?.find((v: { id: string }) => v.id === versionId);
        if (!version) {
          toast.error('Versi tidak ditemukan');
          return;
        }
        setVersionData(version);
      } catch (err) {
        log.error('Failed to fetch version', { err, key, versionId });
        toast.error('Gagal memuat versi template');
      } finally {
        setLoading(false);
      }
    }
    fetchVersion();
  }, [key, versionId]);

  if (loading) return <SkeletonForm fields={5} />;
  if (!versionData) return <div className="text-gray-500">Versi tidak ditemukan.</div>;

  return (
    <div className="space-y-6">
      <DynamicBreadcrumb />
      <TemplateVersionEditor templateKey={key} initialData={versionData} mode="view" />
    </div>
  );
}

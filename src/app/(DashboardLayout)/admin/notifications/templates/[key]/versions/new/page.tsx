'use client';

/**
 * /admin/notifications/templates/[key]/versions/new — Create new template version
 * Roles: SC, SUPERADMIN
 */

import { useParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { TemplateVersionEditor } from '@/components/notifications/TemplateVersionEditor';

export default function NewTemplateVersionPage() {
  const params = useParams();
  const key = params.key as string;

  return (
    <div className="space-y-6">
      <DynamicBreadcrumb />
      <TemplateVersionEditor templateKey={key} mode="new" />
    </div>
  );
}

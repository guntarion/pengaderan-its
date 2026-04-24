/**
 * src/app/(DashboardLayout)/admin/master/taksonomi/page.tsx
 * SUPERADMIN-only taxonomy meta editor.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Tags } from 'lucide-react';
import { getTaxonomyMeta } from '@/lib/master-data/services/taxonomy.service';
import { TaxonomyMetaEditor } from '@/components/admin/master/TaxonomyMetaEditor';

export const metadata: Metadata = {
  title: 'Edit Taksonomi — Admin NAWASENA',
};

export default async function AdminTaksonomiPage() {
  const items = await getTaxonomyMeta();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      <div className="bg-gradient-to-r from-violet-500 to-blue-600 text-white py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/admin/master" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Master Data
          </Link>
          <div className="flex items-center gap-3">
            <Tags className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">Edit Taksonomi</h1>
              <p className="text-white/80 text-sm">{items.length} label bilingual — SUPERADMIN only</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <TaxonomyMetaEditor items={items} />
      </div>
    </div>
  );
}

/**
 * src/app/(DashboardLayout)/referensi/taksonomi/page.tsx
 * Taxonomy reference page — bilingual labels.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Tags } from 'lucide-react';
import { getTaxonomyMeta } from '@/lib/master-data/services/taxonomy.service';
import { TaksonomiDisplay } from '@/components/reference/TaksonomiDisplay';

export const revalidate = 7200;

export const metadata: Metadata = {
  title: 'Taksonomi — Referensi NAWASENA',
};

export default async function TaksonomiPage() {
  const items = await getTaxonomyMeta();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      <div className="bg-gradient-to-r from-violet-500 to-blue-600 text-white py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link href="/referensi" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Referensi
          </Link>
          <div className="flex items-center gap-3">
            <Tags className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">Taksonomi</h1>
              <p className="text-white/80 text-sm">{items.length} label bilingual</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <TaksonomiDisplay items={items} />
      </div>
    </div>
  );
}

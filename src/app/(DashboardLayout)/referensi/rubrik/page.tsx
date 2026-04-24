/**
 * src/app/(DashboardLayout)/referensi/rubrik/page.tsx
 * AAC&U Rubric reference page.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { getRubrikList } from '@/lib/master-data/services/reference.service';
import { RubrikLevelTable } from '@/components/reference/RubrikLevelTable';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Rubrik AAC&U — Referensi NAWASENA',
};

export default async function RubrikPage() {
  const rubrikList = await getRubrikList();

  // Group by rubrikKey
  const grouped = rubrikList.reduce<Record<string, { rubrikKey: string; rubrikLabel: string; levels: typeof rubrikList }>>(
    (acc, item) => {
      if (!acc[item.rubrikKey]) {
        acc[item.rubrikKey] = { rubrikKey: item.rubrikKey, rubrikLabel: item.rubrikLabel, levels: [] };
      }
      acc[item.rubrikKey].levels.push(item);
      return acc;
    },
    {},
  );

  const groups = Object.values(grouped);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/referensi" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Referensi
          </Link>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">Rubrik AAC&U</h1>
              <p className="text-white/80 text-sm">{groups.length} rubrik × 4 level</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-5">
        {groups.map((group) => (
          <RubrikLevelTable
            key={group.rubrikKey}
            rubrikKey={group.rubrikKey}
            rubrikLabel={group.rubrikLabel}
            levels={group.levels}
          />
        ))}
        {groups.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">
            Belum ada rubrik tersedia.
          </p>
        )}
      </div>
    </div>
  );
}

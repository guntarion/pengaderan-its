/**
 * src/app/(DashboardLayout)/referensi/forbidden-acts/page.tsx
 * Forbidden Acts reference page.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { getForbiddenActs } from '@/lib/master-data/services/reference.service';
import { ForbiddenActCard } from '@/components/reference/ForbiddenActCard';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Forbidden Acts — Referensi NAWASENA',
};

export default async function ForbiddenActsPage() {
  const acts = await getForbiddenActs();

  const bySeverity = {
    CRITICAL: acts.filter((a) => a.severity === 'CRITICAL'),
    HIGH: acts.filter((a) => a.severity === 'HIGH'),
    MEDIUM: acts.filter((a) => a.severity === 'MEDIUM'),
    LOW: acts.filter((a) => a.severity === 'LOW'),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link href="/referensi" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Referensi
          </Link>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">Forbidden Acts</h1>
              <p className="text-white/80 text-sm">{acts.length} larangan tercatat</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        {Object.entries(bySeverity).map(([severity, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={severity}>
              <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                {severity} ({items.length})
              </h2>
              <div className="space-y-3">
                {items.map((act) => (
                  <ForbiddenActCard key={act.id} act={act} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

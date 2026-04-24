/**
 * src/app/(DashboardLayout)/referensi/form-inventory/page.tsx
 * Form Inventory reference page.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { getFormInventory } from '@/lib/master-data/services/reference.service';
import { FormInventoryTable } from '@/components/reference/FormInventoryTable';

export const revalidate = 7200;

export const metadata: Metadata = {
  title: 'Inventori Form — Referensi NAWASENA',
};

export default async function FormInventoryPage() {
  const items = await getFormInventory();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/referensi" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Referensi
          </Link>
          <div className="flex items-center gap-3">
            <ClipboardList className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">Inventori Form</h1>
              <p className="text-white/80 text-sm">{items.length} form tercatat</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <FormInventoryTable items={items} />
        </div>
      </div>
    </div>
  );
}

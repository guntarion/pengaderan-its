/**
 * src/app/(DashboardLayout)/referensi/safeguard/page.tsx
 * Safeguard Protocol reference page.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Shield } from 'lucide-react';
import { getSafeguardProtocols } from '@/lib/master-data/services/reference.service';
import { SafeguardProtocolCard } from '@/components/reference/SafeguardProtocolCard';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Safeguard Protocol — Referensi NAWASENA',
};

export default async function SafeguardPage() {
  const protocols = await getSafeguardProtocols();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link href="/referensi" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Referensi
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">Safeguard Protocol</h1>
              <p className="text-white/80 text-sm">{protocols.length} protokol perlindungan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-4">
        {protocols.map((protocol) => (
          <SafeguardProtocolCard key={protocol.id} protocol={protocol} />
        ))}
        {protocols.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">
            Belum ada protokol tersedia.
          </p>
        )}
      </div>
    </div>
  );
}

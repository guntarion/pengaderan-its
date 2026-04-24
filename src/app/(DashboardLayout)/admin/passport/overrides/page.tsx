'use client';

/**
 * src/app/(DashboardLayout)/admin/passport/overrides/page.tsx
 * NAWASENA M05 — SC Admin override page: search entry + override status.
 */

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { StatusBadge } from '@/components/passport/StatusBadge';
import { EvidenceTypeBadge } from '@/components/shared/EvidenceTypeBadge';
import { OverrideForm } from '@/components/admin-passport/OverrideForm';

interface EntrySearchResult {
  id: string;
  status: string;
  evidenceType: string;
  submittedAt: string;
  item: { namaItem: string; dimensi: string };
  user: { fullName: string; nrp?: string | null };
}

export default function AdminOverridesPage() {
  useSession(); // Required for auth guard
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EntrySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntrySearchResult | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSelectedEntry(null);
    try {
      const res = await fetch(
        `/api/admin/passport/aggregate?search=${encodeURIComponent(query.trim())}`,
      );
      if (res.ok) {
        const { data } = await res.json();
        setResults(data?.entries ?? []);
      }
    } catch {
      // Silent
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/passport" className="text-white/80 hover:text-white text-sm">
              &larr; Admin Passport
            </Link>
          </div>
          <h1 className="text-xl font-bold">Override Entry</h1>
          <p className="text-sm text-sky-100 mt-1">
            SC/Admin dapat mengubah status pengajuan secara paksa dengan alasan
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-5">
        <DynamicBreadcrumb />

        {/* Search */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Cari Pengajuan
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="NRP, nama mahasiswa, atau nama item..."
              className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold text-sm transition-colors flex items-center gap-2"
            >
              {isSearching && (
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Cari
            </button>
          </div>
        </div>

        {/* Search results */}
        {results.length > 0 && !selectedEntry && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Hasil Pencarian ({results.length})
            </h3>
            <div className="space-y-2">
              {results.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntry(entry)}
                  className="w-full text-left bg-gray-50 dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl p-3 flex items-start justify-between gap-3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {entry.user.fullName}
                      {entry.user.nrp && (
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          ({entry.user.nrp})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {entry.item.namaItem} · {entry.item.dimensi}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <EvidenceTypeBadge type={entry.evidenceType} />
                    <StatusBadge
                      status={
                        entry.status as 'VERIFIED' | 'PENDING' | 'REJECTED' | 'CANCELLED'
                      }
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && query && !isSearching && (
          <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
            Tidak ada hasil untuk &quot;{query}&quot;
          </div>
        )}

        {/* Override form */}
        {selectedEntry && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSelectedEntry(null)}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
            >
              &larr; Kembali ke hasil pencarian
            </button>
            <OverrideForm
              entryId={selectedEntry.id}
              currentStatus={selectedEntry.status}
              mabaName={selectedEntry.user.fullName}
              itemName={selectedEntry.item.namaItem}
              onSuccess={() => {
                setSelectedEntry(null);
                setResults([]);
                setQuery('');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

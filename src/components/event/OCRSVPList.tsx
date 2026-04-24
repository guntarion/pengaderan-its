/**
 * src/components/event/OCRSVPList.tsx
 * Full RSVP list for OC with status tabs and CSV export.
 * Uses data shape from getListOC service.
 */

'use client';

import React, { useState } from 'react';
import { DownloadIcon, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';

interface RSVPEntry {
  id: string;
  status: 'CONFIRMED' | 'WAITLIST' | 'DECLINED';
  respondedAt: string;
  waitlistPosition?: number | null;
  user: {
    id: string;
    fullName: string;
    displayName: string | null;
    nrp?: string | null;
    email: string;
  };
}

interface OCRSVPData {
  confirmed: RSVPEntry[];
  waitlist: RSVPEntry[];
  declined: RSVPEntry[];
  total: number;
}

interface OCRSVPListProps {
  instanceId: string;
  data: OCRSVPData;
}

type TabKey = 'confirmed' | 'waitlist' | 'declined';

const TAB_LABELS: Record<TabKey, string> = {
  confirmed: 'Terdaftar',
  waitlist: 'Antrean',
  declined: 'Batal',
};

const STATUS_BADGE: Record<TabKey, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  waitlist: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  declined: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export function OCRSVPList({ instanceId, data }: OCRSVPListProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('confirmed');
  const [exporting, setExporting] = useState(false);

  const filtered = data[activeTab];
  const counts: Record<TabKey, number> = {
    confirmed: data.confirmed.length,
    waitlist: data.waitlist.length,
    declined: data.declined.length,
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/event/instances/${instanceId}/rsvp-list/export`);
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rsvp-${instanceId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV berhasil diunduh');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with export */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {(['confirmed', 'waitlist', 'declined'] as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 text-gray-700 dark:text-gray-300'
              }`}
            >
              {TAB_LABELS[tab]}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="outline"
          className="text-sm rounded-xl border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <DownloadIcon className="h-4 w-4 mr-1.5" />}
          Export CSV
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
          Tidak ada peserta di kategori ini.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-sky-100 dark:border-sky-900">
          <table className="w-full text-sm">
            <thead className="bg-sky-50 dark:bg-slate-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Nama</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">NRP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50 dark:divide-slate-700">
              {filtered.map((rsvp, idx) => (
                <tr key={rsvp.id} className="bg-white dark:bg-slate-800 hover:bg-sky-50/50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                    {rsvp.user.displayName ?? rsvp.user.fullName}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">{rsvp.user.email}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">{rsvp.user.nrp ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_BADGE[activeTab]}`}>
                      {TAB_LABELS[activeTab]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

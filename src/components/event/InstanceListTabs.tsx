/**
 * src/components/event/InstanceListTabs.tsx
 * Tab switcher for Upcoming / Ongoing / Past buckets in Maba event listing.
 */

'use client';

import React from 'react';

type TabKey = 'upcoming' | 'ongoing' | 'past';

interface InstanceListTabsProps {
  active: TabKey;
  counts: { upcoming: number; ongoing: number; past: number };
  onChange: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Akan Datang' },
  { key: 'ongoing', label: 'Sedang Berlangsung' },
  { key: 'past', label: 'Telah Selesai' },
];

export function InstanceListTabs({ active, counts, onChange }: InstanceListTabsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {TABS.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-sky-500 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 text-gray-700 dark:text-gray-300 hover:border-sky-300 dark:hover:border-sky-700'
            }`}
          >
            <span>{label}</span>
            {counts[key] > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                }`}
              >
                {counts[key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

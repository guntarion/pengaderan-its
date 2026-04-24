/**
 * src/components/event/OCInstanceTabs.tsx
 * Tab switcher for OC instance detail: RSVP List, Attendance, NPS.
 */

'use client';

import React from 'react';

export type OCTab = 'rsvp' | 'attendance' | 'nps';

interface OCInstanceTabsProps {
  active: OCTab;
  onChange: (tab: OCTab) => void;
}

const TABS: { key: OCTab; label: string }[] = [
  { key: 'rsvp', label: 'Daftar RSVP' },
  { key: 'attendance', label: 'Kehadiran' },
  { key: 'nps', label: 'NPS Feedback' },
];

export function OCInstanceTabs({ active, onChange }: OCInstanceTabsProps) {
  return (
    <div className="flex gap-2 border-b border-sky-100 dark:border-sky-900 pb-0">
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-2.5 text-sm font-medium transition-all rounded-t-xl border-b-2 ${
            active === key
              ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

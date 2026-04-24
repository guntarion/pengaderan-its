/**
 * src/components/event/OCAttendanceStub.tsx
 * Attendance count cards stub for OC view. Full attendance editing is M08.
 */

import React from 'react';
import { UsersIcon, AlertCircleIcon } from 'lucide-react';

interface OCAttendanceStubProps {
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  total: number;
}

export function OCAttendanceStub({ hadir, izin, sakit, alpa, total }: OCAttendanceStubProps) {
  const cards = [
    { label: 'Hadir', value: hadir, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
    { label: 'Izin', value: izin, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
    { label: 'Sakit', value: sakit, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
    { label: 'Alpa', value: alpa, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <UsersIcon className="h-4 w-4" />
          Kehadiran ({total} terdaftar)
        </h3>
        <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
          Pengelolaan detail di M08
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(({ label, value, color, bg, border }) => (
          <div key={label} className={`${bg} ${border} border rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>
      {hadir === 0 && total > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <AlertCircleIcon className="h-3.5 w-3.5" />
          Data kehadiran belum diinput. Gunakan modul Absensi (M08) untuk input kehadiran.
        </div>
      )}
    </div>
  );
}

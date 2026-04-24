/**
 * src/components/kp-mood/NotCheckedInList.tsx
 * NAWASENA M04 — List of Maba who have not checked in today.
 * Only visible after 20:00 local time per PRD.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Member {
  id: string;
  displayName: string | null;
  fullName: string;
}

interface NotCheckedInListProps {
  members: Member[];
  currentHour: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function NotCheckedInList({ members, currentHour }: NotCheckedInListProps) {
  return (
    <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Belum Check-in Hari Ini
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentHour < 20 ? (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-400">
            Daftar tersedia setelah pukul 20:00.
          </div>
        ) : members.length === 0 ? (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm">
            Semua anggota sudah check-in hari ini.
          </div>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-3 p-2 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800"
              >
                {/* Avatar initials */}
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-sky-200 dark:bg-sky-700 flex items-center justify-center">
                  <span className="text-xs font-semibold text-sky-700 dark:text-sky-200">
                    {getInitials(member.fullName)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {member.displayName ?? member.fullName}
                  </p>
                  {member.displayName && member.displayName !== member.fullName && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{member.fullName}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

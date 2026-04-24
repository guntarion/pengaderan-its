/**
 * src/components/kp-mood/RedFlagPanel.tsx
 * NAWASENA M04 — Panel showing active red-flag alerts for KP.
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface RedFlagEvent {
  id: string;
  userId: string;
  userName: string;
  triggeredAt: string;
  status: string;
  avgMood: number;
}

interface RedFlagPanelProps {
  events: RedFlagEvent[];
  onFollowUp: (eventId: string) => void;
}

function timeAgo(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return 'Baru saja';
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return (
      <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-medium">
        Aktif
      </span>
    );
  }
  if (status === 'ESCALATED') {
    return (
      <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full font-medium">
        Eskalasi
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full font-medium">
      {status}
    </span>
  );
}

export function RedFlagPanel({ events, onFollowUp }: RedFlagPanelProps) {
  return (
    <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-red-100 dark:border-red-900">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          Red Flag Aktif
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm">
            Tidak ada red flag aktif.
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {event.userName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Rata-rata mood:{' '}
                      <span className="font-medium text-red-500 dark:text-red-400">
                        {event.avgMood.toFixed(1)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {timeAgo(event.triggeredAt)}
                    </p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <button
                  onClick={() => onFollowUp(event.id)}
                  className="w-full text-xs bg-red-500 hover:bg-red-600 text-white rounded-xl py-1.5 px-3 font-medium transition-colors"
                >
                  Catat Tindak Lanjut
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

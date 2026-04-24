'use client';

/**
 * src/app/(DashboardLayout)/admin/passport/qr-generator/page.tsx
 * NAWASENA M05 — SC QR Generator: create sessions, view active sessions, revoke.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { QrGeneratorForm } from '@/components/admin-passport/QrGeneratorForm';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/hooks/useConfirm';

interface PassportItemOption {
  id: string;
  namaItem: string;
  dimensi: string;
}

interface ActiveSession {
  id: string;
  itemId: string;
  eventName: string;
  expiresAt: string;
  maxScans: number;
  scanCount: number;
  status: string;
  item: { namaItem: string };
}

export default function QrGeneratorPage() {
  const { data: session } = useSession();
  const { confirm, ConfirmDialog } = useConfirm();

  const [items, setItems] = useState<PassportItemOption[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    async function fetchItems() {
      try {
        const res = await fetch('/api/passport/items?all=true');
        if (res.ok) {
          const { data } = await res.json();
          setItems(data ?? []);
        }
      } catch {
        // Silent
      } finally {
        setIsLoadingItems(false);
      }
    }
    fetchItems();
  }, [session]);

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/admin/passport/qr-session');
      if (res.ok) {
        const { data } = await res.json();
        setActiveSessions(data ?? []);
      }
    } catch {
      // Silent
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchSessions();
  }, [session, fetchSessions]);

  const handleRevoke = useCallback(async (sessionId: string, eventName: string) => {
    const ok = await confirm(
      `Cabut QR Session "${eventName}"?`,
      'Scan berikutnya akan ditolak secara otomatis.',
    );
    if (!ok) return;

    setRevokingId(sessionId);
    try {
      const res = await fetch(`/api/admin/passport/qr-session/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Dicabut oleh SC' }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }
      toast.success('QR Session berhasil dicabut.');
      await fetchSessions();
    } catch {
      toast.error('Gagal mencabut QR Session.');
    } finally {
      setRevokingId(null);
    }
  }, [confirm, fetchSessions]);

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
          <h1 className="text-xl font-bold">QR Generator</h1>
          <p className="text-sm text-sky-100 mt-1">Generate QR code untuk verifikasi passport</p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-5">
        <DynamicBreadcrumb />

        {/* Generator form */}
        <ErrorBoundary>
          {isLoadingItems ? (
            <SkeletonCard />
          ) : (
            <QrGeneratorForm
              items={items}
              onSessionCreated={() => fetchSessions()}
            />
          )}
        </ErrorBoundary>

        {/* Active sessions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            QR Sessions Aktif
          </h3>
          {isLoadingSessions ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : activeSessions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Tidak ada QR session aktif.
            </p>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-slate-700 rounded-xl p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {s.eventName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {s.item.namaItem} · {s.scanCount}/{s.maxScans} scan · berlaku hingga{' '}
                      {new Date(s.expiresAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(s.id, s.eventName)}
                    disabled={revokingId === s.id}
                    className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    {revokingId === s.id && (
                      <div className="h-3 w-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    Cabut
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog />
    </div>
  );
}

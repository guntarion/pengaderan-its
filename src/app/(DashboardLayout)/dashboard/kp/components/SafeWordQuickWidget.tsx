'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kp/components/SafeWordQuickWidget.tsx
 * NAWASENA M10 — Safe Word quick report widget for KP dashboard.
 *
 * Prominent red widget displayed at the TOP of the KP dashboard.
 * Triggers 2-step confirmation modal before submitting.
 * Role-gated: visible only to KP users.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertOctagon } from 'lucide-react';
import { SafeWordConfirmModal } from '@/components/safeguard/SafeWordConfirmModal';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('safe-word-widget');

interface SafeWordQuickWidgetProps {
  cohortId: string;
}

export function SafeWordQuickWidget({ cohortId }: SafeWordQuickWidgetProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  async function handleConfirm(data: { cohortId: string; reasonShort?: string }) {
    log.info('Submitting safe word report', { cohortId: data.cohortId });

    const res = await fetch('/api/safeguard/incidents/safe-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      const message = json.error?.message ?? 'Gagal melaporkan insiden darurat';
      log.error('Safe word submission failed', { status: res.status, message });
      throw new Error(message);
    }

    const { incidentId, detailUrl } = json.data;
    log.info('Safe word incident created', { incidentId });

    toast.success(
      'Laporan darurat berhasil dikirim! SC sedang dinotifikasi.',
      `ID Insiden: ${incidentId}`,
    );
    // Navigate to detail after short delay
    setTimeout(() => router.push(detailUrl), 1500);
  }

  return (
    <>
      {/* Widget */}
      <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-red-100 p-4 dark:border-red-900 dark:from-red-950/40 dark:to-red-900/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
              <AlertOctagon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-900 dark:text-red-200">
                TIME OUT — Laporan Darurat
              </p>
              <p className="text-xs text-red-700 dark:text-red-400">
                Tekan tombol ini jika ada situasi darurat atau penggunaan Safe Word
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 border-red-400 bg-red-600 text-white hover:bg-red-700 dark:border-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            onClick={() => setModalOpen(true)}
          >
            <AlertOctagon className="mr-1.5 h-4 w-4" />
            LAPORKAN
          </Button>
        </div>
      </div>

      {/* Modal */}
      <SafeWordConfirmModal
        open={modalOpen}
        cohortId={cohortId}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}

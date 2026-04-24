/**
 * src/components/anon-report/StatusTrackerCard.tsx
 * NAWASENA M12 — Public status tracker display component.
 *
 * Only shows allowlisted fields (no body, no identity info).
 */

import { CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { AnonStatus, AnonSeverity, AnonCategory } from '@prisma/client';

interface StatusData {
  status: AnonStatus;
  category: AnonCategory;
  severity: AnonSeverity;
  acknowledgedAt: Date | null;
  recordedAt: Date;
  publicNote: string | null;
  closedAt: Date | null;
}

interface StatusTrackerCardProps {
  data: StatusData;
  trackingCode: string;
}

const STATUS_CONFIG = {
  [AnonStatus.NEW]: {
    label: 'Diterima',
    description: 'Laporan Anda telah diterima dan menunggu ditinjau oleh petugas.',
    icon: Clock,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-100 dark:border-sky-900',
  },
  [AnonStatus.IN_REVIEW]: {
    label: 'Sedang Ditinjau',
    description: 'Petugas sedang meninjau laporan Anda.',
    icon: ArrowRight,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-100 dark:border-amber-900',
  },
  [AnonStatus.ESCALATED_TO_SATGAS]: {
    label: 'Diteruskan ke Satgas',
    description: 'Laporan Anda telah diteruskan ke Satgas PPKPT untuk penanganan lebih lanjut.',
    icon: AlertCircle,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-100 dark:border-orange-900',
  },
  [AnonStatus.RESOLVED]: {
    label: 'Selesai',
    description: 'Laporan Anda telah diselesaikan.',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-100 dark:border-green-900',
  },
};

const CATEGORY_LABELS: Record<AnonCategory, string> = {
  BULLYING: 'Perundungan',
  HARASSMENT: 'Pelecehan',
  UNFAIR: 'Ketidakadilan',
  SUGGESTION: 'Saran',
  OTHER: 'Lainnya',
};

function formatDate(date: Date | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function StatusTrackerCard({ data, trackingCode }: StatusTrackerCardProps) {
  const statusConfig = STATUS_CONFIG[data.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className={`flex items-start gap-4 rounded-2xl border p-5 ${statusConfig.bg} ${statusConfig.border}`}
      >
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border ${statusConfig.border} bg-white/50 dark:bg-black/10`}
        >
          <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
        </div>
        <div>
          <p className={`text-lg font-bold ${statusConfig.color}`}>{statusConfig.label}</p>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            {statusConfig.description}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-sky-100 bg-white p-5 dark:border-sky-900 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Rincian Laporan
        </h3>

        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500 dark:text-gray-400">Kode Laporan</dt>
            <dd className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
              {trackingCode}
            </dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-sm text-gray-500 dark:text-gray-400">Kategori</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {CATEGORY_LABELS[data.category]}
            </dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-sm text-gray-500 dark:text-gray-400">Tanggal Laporan</dt>
            <dd className="text-sm text-gray-700 dark:text-gray-300">
              {formatDate(data.recordedAt)}
            </dd>
          </div>

          {data.acknowledgedAt && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Diakui Petugas</dt>
              <dd className="text-sm text-gray-700 dark:text-gray-300">
                {formatDate(data.acknowledgedAt)}
              </dd>
            </div>
          )}

          {data.closedAt && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Diselesaikan</dt>
              <dd className="text-sm text-gray-700 dark:text-gray-300">
                {formatDate(data.closedAt)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Public note from BLM */}
      {data.publicNote && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/20">
          <p className="mb-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            Catatan dari Petugas
          </p>
          <p className="text-sm text-gray-800 dark:text-gray-200">{data.publicNote}</p>
        </div>
      )}
    </div>
  );
}

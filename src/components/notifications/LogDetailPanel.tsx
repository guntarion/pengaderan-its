'use client';

/**
 * src/components/notifications/LogDetailPanel.tsx
 * NAWASENA M15 — Sheet panel showing full notification log details
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export interface NotificationLogDetail {
  id: string;
  userId: string;
  templateKey: string;
  channel: string;
  category: string;
  status: string;
  providerMessageId: string | null;
  retryCount: number;
  criticalOverride: boolean;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
  ruleExecutionId: string | null;
  ruleId: string | null;
  user: { fullName: string; nrp: string | null };
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface LogDetailPanelProps {
  log: NotificationLogDetail | null;
  open: boolean;
  onClose: () => void;
}

const statusColor = (s: string) => {
  switch (s) {
    case 'DELIVERED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'SENT': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'FAILED':
    case 'BOUNCED':
    case 'COMPLAINED': return 'bg-red-100 text-red-800 border-red-300';
    case 'SKIPPED_USER_OPTOUT':
    case 'SKIPPED_NO_SUBSCRIPTION':
    case 'SKIPPED_BOUNCE_COOLDOWN': return 'bg-gray-100 text-gray-600 border-gray-300';
    case 'ESCALATED_INSTEAD_OF_SEND': return 'bg-amber-100 text-amber-800 border-amber-300';
    default: return 'bg-gray-100 text-gray-600 border-gray-300';
  }
};

const channelColor = (c: string) => {
  switch (c) {
    case 'PUSH': return 'bg-violet-100 text-violet-800 border-violet-300';
    case 'EMAIL': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'WHATSAPP': return 'bg-green-100 text-green-800 border-green-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <div className="text-sm text-gray-800 dark:text-gray-200">{value}</div>
    </div>
  );
}

export function LogDetailPanel({ log, open, onClose }: LogDetailPanelProps) {
  if (!log) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Detail Log Notifikasi
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Status + Channel badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs border ${statusColor(log.status)}`}>
              {log.status.replace(/_/g, ' ')}
            </Badge>
            <Badge className={`text-xs border ${channelColor(log.channel)}`}>
              {log.channel}
            </Badge>
            {log.criticalOverride && (
              <Badge className="text-xs border bg-red-50 text-red-700 border-red-300">
                CRITICAL Override
              </Badge>
            )}
          </div>

          {/* Core fields */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 p-4 space-y-4">
            <DetailRow label="ID" value={
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono break-all">
                {log.id}
              </code>
            } />
            <DetailRow label="Pengguna" value={
              <span>{log.user.fullName}{log.user.nrp && <span className="text-gray-500 ml-1">({log.user.nrp})</span>}</span>
            } />
            <DetailRow label="Template Key" value={
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono">
                {log.templateKey}
              </code>
            } />
            <DetailRow label="Kategori" value={log.category} />
            <DetailRow label="Retry Count" value={
              <span className={log.retryCount > 0 ? 'text-amber-600' : 'text-gray-700 dark:text-gray-300'}>
                {log.retryCount}x
              </span>
            } />
          </div>

          {/* Timestamps */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 p-4 space-y-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timestamps</h4>
            <DetailRow label="Dibuat" value={
              new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' })
            } />
            {log.sentAt && (
              <DetailRow label="Dikirim" value={
                new Date(log.sentAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' })
              } />
            )}
            {log.deliveredAt && (
              <DetailRow label="Terkirim" value={
                new Date(log.deliveredAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' })
              } />
            )}
            {log.failedAt && (
              <DetailRow label="Gagal" value={
                <span className="text-red-600">
                  {new Date(log.failedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' })}
                </span>
              } />
            )}
          </div>

          {/* Provider + Rule info */}
          {(log.providerMessageId || log.ruleId || log.ruleExecutionId) && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 p-4 space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Referensi</h4>
              {log.providerMessageId && (
                <DetailRow label="Provider Message ID" value={
                  <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono break-all">
                    {log.providerMessageId}
                  </code>
                } />
              )}
              {log.ruleId && (
                <DetailRow label="Rule ID" value={
                  <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono break-all">
                    {log.ruleId}
                  </code>
                } />
              )}
              {log.ruleExecutionId && (
                <DetailRow label="Execution ID" value={
                  <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono break-all">
                    {log.ruleExecutionId}
                  </code>
                } />
              )}
            </div>
          )}

          {/* Error message */}
          {log.errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
              <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">
                Error
              </h4>
              <p className="text-xs text-red-800 dark:text-red-300 font-mono break-all">
                {log.errorMessage}
              </p>
            </div>
          )}

          {/* Metadata JSON */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Metadata</h4>
              <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg overflow-auto max-h-48 font-mono">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

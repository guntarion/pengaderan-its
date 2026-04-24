'use client';

/**
 * /admin/users/bulk-import
 * Bulk CSV user import page for SC and SUPERADMIN.
 *
 * Flow:
 *   1. Upload CSV → preview summary + error table + valid sample
 *   2. Review decisions for existing users (SKIP / UPDATE)
 *   3. Confirm + commit → progress manifest
 *
 * Auth: server-side guard handled by middleware (SC / SUPERADMIN).
 */

import { useState, useCallback } from 'react';
import { Users, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import {
  BulkImportUploader,
  type PreviewResult,
} from '@/components/admin/BulkImportUploader';
import { BulkImportPreviewTable } from '@/components/admin/BulkImportPreviewTable';
import { createLogger } from '@/lib/logger';

const log = createLogger('bulk-import-page');

interface CommitResult {
  committed: number;
  updated: number;
  skipped: number;
  failed: number;
  failedRows: Array<{ lineNumber: number; email: string; error: string }>;
}

export default function BulkImportPage() {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [decisions, setDecisions] = useState<Record<string, 'SKIP' | 'UPDATE'>>({});
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const handlePreviewResult = useCallback((result: PreviewResult) => {
    setPreview(result);
    setDecisions({});
    setCommitResult(null);
  }, []);

  const handleDecisionChange = useCallback(
    (email: string, decision: 'SKIP' | 'UPDATE') => {
      setDecisions((prev) => ({ ...prev, [email]: decision }));
    },
    []
  );

  const handleCommit = useCallback(async () => {
    if (!preview?.token) return;

    const hasErrors = (preview.summary?.errorRows ?? 0) > 0;
    const validCount = preview.summary?.validRows ?? 0;

    // First confirmation
    const confirmed = await confirm({
      title: 'Konfirmasi Import',
      description: hasErrors
        ? `${validCount} baris valid akan diimport. ${preview.summary?.errorRows} baris dengan error akan dilewati.`
        : `Akan mengimport ${validCount} baris. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Lanjutkan',
      variant: 'default',
    });
    if (!confirmed) return;

    // Second confirmation for destructive action
    const doubleConfirmed = await confirm({
      title: 'Konfirmasi Akhir',
      description: 'Data akan disimpan ke database. Yakin ingin melanjutkan?',
      confirmLabel: 'Import Sekarang',
      variant: 'destructive',
    });
    if (!doubleConfirmed) return;

    setIsCommitting(true);
    log.info('Starting bulk import commit', {
      token: preview.token.slice(0, 8) + '...',
      validRows: validCount,
    });

    try {
      const res = await fetch('/api/admin/users/bulk-import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewToken: preview.token,
          decisions,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.apiError(json);
        return;
      }

      const result = json.data as CommitResult;
      setCommitResult(result);
      setPreview(null);

      if (result.failed === 0) {
        toast.success(
          `Import berhasil: ${result.committed} user baru, ${result.updated} diperbarui, ${result.skipped} dilewati`
        );
      } else {
        toast.error(
          `Import selesai dengan ${result.failed} kegagalan. Periksa hasil di bawah.`
        );
      }
    } catch (err) {
      toast.error('Kesalahan jaringan saat commit');
      log.error('Commit error', { error: err });
    } finally {
      setIsCommitting(false);
    }
  }, [preview, decisions, confirm]);

  const canCommit =
    preview?.token &&
    (preview.summary?.validRows ?? 0) > 0 &&
    !isCommitting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />

        {/* Page Header */}
        <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Bulk Import User</h1>
              <p className="text-sm text-sky-100 mt-0.5">
                Upload CSV untuk onboarding massal MABA dan panitia
              </p>
            </div>
          </div>
        </div>

        {/* Back button + help */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-1.5">
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Daftar User
            </Link>
          </Button>
        </div>

        {/* Commit success result */}
        {commitResult && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Import selesai
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Dibuat</span>
                    <p className="font-bold text-emerald-600">{commitResult.committed}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Diperbarui</span>
                    <p className="font-bold text-blue-600">{commitResult.updated}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Dilewati</span>
                    <p className="font-bold text-gray-500">{commitResult.skipped}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Gagal</span>
                    <p className="font-bold text-red-500">{commitResult.failed}</p>
                  </div>
                </div>

                {commitResult.failedRows.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                      Baris gagal:
                    </p>
                    <ul className="space-y-0.5">
                      {commitResult.failedRows.map((r, i) => (
                        <li key={i} className="text-xs text-red-500 dark:text-red-400">
                          Baris {r.lineNumber} ({r.email}): {r.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-emerald-700 border-emerald-300 bg-transparent hover:bg-emerald-100"
                  onClick={() => setCommitResult(null)}
                >
                  Import file baru
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upload section */}
        {!commitResult && (
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              1. Upload file CSV
            </h2>
            <BulkImportUploader
              onPreviewResult={handlePreviewResult}
              disabled={isCommitting}
            />
          </div>
        )}

        {/* Preview section */}
        {preview && !commitResult && (
          <>
            <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                2. Review hasil preview
              </h2>
              <BulkImportPreviewTable
                preview={preview}
                decisions={decisions}
                onDecisionChange={handleDecisionChange}
              />
            </div>

            {/* Commit button */}
            {canCommit && (
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setPreview(null)}
                  disabled={isCommitting}
                >
                  Batalkan
                </Button>
                <Button
                  onClick={handleCommit}
                  disabled={!canCommit}
                  className="bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90 px-8"
                >
                  {isCommitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Mengimport...
                    </span>
                  ) : (
                    `Commit Import (${preview.summary?.validRows} baris)`
                  )}
                </Button>
              </div>
            )}

            {!preview.token && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                Tidak ada baris valid untuk diimport.
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog />
    </div>
  );
}

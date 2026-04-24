/**
 * src/components/admin/master/SeedApplyButton.tsx
 * Seed apply button with confirmation dialog.
 */

'use client';

import React, { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { Loader2, Zap } from 'lucide-react';
import { SeedPreviewReport } from './SeedPreviewReport';

interface SeedResult {
  success: boolean;
  report: Record<string, { added: number; updated: number; unchanged: number; orphaned: number }> | null;
  raw: string | null;
  error?: string | null;
}

export function SeedApplyButton() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<SeedResult | null>(null);
  const [applyResult, setApplyResult] = useState<SeedResult | null>(null);

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const res = await fetch('/api/admin/seed/preview', { method: 'POST' });
      const body = await res.json();
      setPreviewResult(body.data ?? body);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    const confirmed = await confirm({
      title: 'Apply Seed Data?',
      description:
        'Tindakan ini akan meng-upsert data master dari CSV. Data yang ada tidak akan dihapus, hanya ditambah/diperbarui.',
      confirmLabel: 'Apply',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setApplyLoading(true);
    setApplyResult(null);
    try {
      const res = await fetch('/api/admin/seed/apply', { method: 'POST' });
      const body = await res.json();
      const result = body.data ?? body;
      setApplyResult(result);
      if (result.success) {
        toast.success('Seed berhasil dijalankan');
      } else {
        toast.error('Seed gagal — lihat output');
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handlePreview}
          disabled={previewLoading || applyLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-sky-300 dark:border-sky-600 text-sky-600 dark:text-sky-400 rounded-xl text-sm font-medium hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors disabled:opacity-50"
        >
          {previewLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Preview Diff
        </button>

        <button
          onClick={handleApply}
          disabled={previewLoading || applyLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {applyLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Apply Seed
        </button>
      </div>

      {/* Preview result */}
      {previewResult && (
        <div>
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Preview Result</h3>
          <SeedPreviewReport
            report={previewResult.report}
            raw={previewResult.raw}
            error={previewResult.error}
          />
        </div>
      )}

      {/* Apply result */}
      {applyResult && (
        <div>
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Apply Result</h3>
          <SeedPreviewReport
            report={applyResult.report}
            raw={applyResult.raw}
            error={applyResult.error}
          />
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}

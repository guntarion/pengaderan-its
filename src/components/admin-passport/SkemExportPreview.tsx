'use client';

/**
 * src/components/admin-passport/SkemExportPreview.tsx
 * NAWASENA M05 — Preview form for SKEM CSV export with download trigger.
 */

import { useState, useCallback } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from '@/lib/toast';

interface SkemPreviewRow {
  nrp: string;
  nama: string;
  skemCategory: string;
  totalPoints: number;
  verifiedItems: number;
}

interface SkemExportPreviewProps {
  cohortId: string;
}

const columns: ColumnDef<SkemPreviewRow>[] = [
  { accessorKey: 'nrp', header: 'NRP' },
  { accessorKey: 'nama', header: 'Nama' },
  { accessorKey: 'skemCategory', header: 'Kategori SKEM' },
  {
    accessorKey: 'totalPoints',
    header: 'Total Poin',
    cell: ({ row }) => (
      <span className="font-mono font-medium text-emerald-700 dark:text-emerald-300">
        {row.original.totalPoints.toFixed(2)}
      </span>
    ),
  },
  { accessorKey: 'verifiedItems', header: 'Item Terverifikasi' },
];

export function SkemExportPreview({ cohortId }: SkemExportPreviewProps) {
  const [previewData, setPreviewData] = useState<SkemPreviewRow[]>([]);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [checksum, setChecksum] = useState<string | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePreview = useCallback(async () => {
    setIsFetchingPreview(true);
    try {
      const res = await fetch(
        `/api/admin/passport/skem-export?cohortId=${encodeURIComponent(cohortId)}&preview=true&limit=20`,
      );
      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }
      const { data } = await res.json();
      setPreviewData(data.rows ?? []);
      setRowCount(data.rowCount ?? null);
      setChecksum(data.checksumSha256 ?? null);
    } catch {
      toast.error('Gagal mengambil preview data.');
    } finally {
      setIsFetchingPreview(false);
    }
  }, [cohortId]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(
        `/api/admin/passport/skem-export?cohortId=${encodeURIComponent(cohortId)}`,
      );
      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skem-passport-${cohortId}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('File CSV berhasil diunduh.');
    } catch {
      toast.error('Gagal mengunduh CSV.');
    } finally {
      setIsDownloading(false);
    }
  }, [cohortId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Export SKEM CSV
          </h3>
          {rowCount !== null && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {rowCount} mahasiswa · Preview 20 baris pertama
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={isFetchingPreview}
            className="text-sm px-4 py-2 rounded-xl border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors font-medium flex items-center gap-2"
          >
            {isFetchingPreview && (
              <div className="h-3.5 w-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            )}
            Preview Data
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="text-sm px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold transition-colors flex items-center gap-2"
          >
            {isDownloading && (
              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Unduh CSV
          </button>
        </div>
      </div>

      {previewData.length > 0 && (
        <>
          <DataTable
            columns={columns}
            data={previewData}
            searchKey="nrp"
            searchPlaceholder="Cari NRP..."
          />
          {checksum && (
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              SHA-256: {checksum}
            </p>
          )}
        </>
      )}

      {previewData.length === 0 && rowCount === null && (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          Klik &quot;Preview Data&quot; untuk melihat sampel export.
        </div>
      )}
    </div>
  );
}

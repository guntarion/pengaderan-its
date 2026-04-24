'use client';

/**
 * src/components/event-execution/AttendanceTable.tsx
 * NAWASENA M08 — OC Attendance management table.
 *
 * Features:
 * - DataTable with per-row status dropdown
 * - Bulk select + "Mark Semua HADIR" button
 * - Walkin section separated by badge
 * - Manual notes input on change
 */

import { useState, useCallback } from 'react';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/hooks/useConfirm';
import { Loader2, Users2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AttendanceRow {
  id: string;
  userId: string;
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA';
  scanMethod: string;
  isWalkin: boolean;
  notes: string | null;
  notedAt: string;
  user: {
    id: string;
    fullName: string;
    displayName: string | null;
    nrp: string | null;
    email: string;
  };
}

interface AttendanceTableProps {
  instanceId: string;
  rows: AttendanceRow[];
  onRefresh: () => void;
}

const STATUS_CONFIG = {
  HADIR: { label: 'Hadir', cls: 'text-green-700 dark:text-green-400' },
  IZIN: { label: 'Izin', cls: 'text-blue-700 dark:text-blue-400' },
  SAKIT: { label: 'Sakit', cls: 'text-amber-700 dark:text-amber-400' },
  ALPA: { label: 'Alpa', cls: 'text-red-700 dark:text-red-400' },
} as const;

const SCAN_METHOD_LABEL: Record<string, string> = {
  QR: 'QR',
  MANUAL: 'Manual',
  BULK: 'Bulk',
  SC_OVERRIDE: 'SC',
  SYSTEM_AUTO: 'Auto',
};

export function AttendanceTable({ instanceId, rows, onRefresh }: AttendanceTableProps) {
  const [changingId, setChangingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const handleStatusChange = useCallback(
    async (row: AttendanceRow, newStatus: string) => {
      setChangingId(row.id);
      try {
        const res = await fetch(`/api/event-execution/instances/${instanceId}/attendance/manual`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: row.userId, status: newStatus }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.apiError(data);
          return;
        }
        toast.success(`Status ${row.user.fullName} diubah ke ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label ?? newStatus}`);
        onRefresh();
      } catch (err) {
        toast.apiError(err);
      } finally {
        setChangingId(null);
      }
    },
    [instanceId, onRefresh],
  );

  const handleBulkHadir = async () => {
    const ok = await confirm(
      'Mark Semua HADIR?',
      'Semua peserta RSVP Confirmed akan ditandai HADIR. Tindakan ini dapat dibatalkan secara manual.',
    );
    if (!ok) return;

    setBulkLoading(true);
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/attendance/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      const { updated, created } = data.data;
      toast.success(`${updated + created} peserta berhasil ditandai HADIR.`);
      onRefresh();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setBulkLoading(false);
    }
  };

  const columns: ColumnDef<AttendanceRow>[] = [
    {
      accessorKey: 'user.fullName',
      header: ({ column }) => <SortableHeader column={column}>Nama</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm text-gray-800 dark:text-gray-200">
            {row.original.user.fullName}
          </p>
          {row.original.user.nrp && (
            <p className="text-xs text-gray-400">{row.original.user.nrp}</p>
          )}
          {row.original.isWalkin && (
            <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded-md">
              walkin
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => {
        const isChanging = changingId === row.original.id;
        return (
          <div className="flex items-center gap-2">
            {isChanging ? (
              <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
            ) : (
              <Select
                value={row.original.status}
                onValueChange={(val) => handleStatusChange(row.original, val)}
              >
                <SelectTrigger className="h-7 w-28 rounded-lg text-xs border-gray-200 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([val, { label, cls }]) => (
                    <SelectItem key={val} value={val} className={`text-xs ${cls}`}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'scanMethod',
      header: 'Metode',
      cell: ({ row }) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {SCAN_METHOD_LABEL[row.original.scanMethod] ?? row.original.scanMethod}
        </span>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Catatan',
      cell: ({ row }) => (
        <span className="text-xs text-gray-500 dark:text-gray-400 max-w-32 truncate block">
          {row.original.notes ?? '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Users2Icon className="h-4 w-4 text-sky-500" />
          <span>{rows.length} peserta terdaftar</span>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleBulkHadir}
          disabled={bulkLoading}
          className="rounded-xl bg-green-500 hover:bg-green-600 text-white h-8 text-xs"
        >
          {bulkLoading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Users2Icon className="mr-1.5 h-3.5 w-3.5" />
          )}
          Mark Semua HADIR
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchKey="user_fullName"
        searchPlaceholder="Cari nama peserta..."
      />

      <ConfirmDialog />
    </div>
  );
}

/**
 * src/components/admin/master/KegiatanAdminTable.tsx
 * Admin DataTable for Kegiatan with isActive toggle.
 */

'use client';

import React, { useState, useTransition } from 'react';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';

interface KegiatanRow {
  id: string;
  nama: string;
  fase: string;
  nilai: string;
  kategori: string;
  isActive: boolean;
  isGlobal: boolean;
  displayOrder: number;
  organizationId: string | null;
}

interface KegiatanAdminTableProps {
  data: KegiatanRow[];
}

async function patchKegiatan(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/master/kegiatan/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}

function ToggleActiveButton({ row, onToggle }: { row: KegiatanRow; onToggle: (id: string, newValue: boolean) => void }) {
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  const handleToggle = () => {
    if (row.isGlobal) {
      toast.error('Kegiatan global hanya dapat diubah oleh SUPERADMIN');
      return;
    }
    setPending(true);
    startTransition(async () => {
      try {
        await patchKegiatan(row.id, { isActive: !row.isActive });
        onToggle(row.id, !row.isActive);
        toast.success(`Kegiatan ${!row.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      } catch (err) {
        toast.apiError(err);
      } finally {
        setPending(false);
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        row.isActive ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'
      } ${pending ? 'opacity-50' : ''}`}
    >
      <span
        className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transform transition-transform ${
          row.isActive ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function KegiatanAdminTable({ data }: KegiatanAdminTableProps) {
  const [rows, setRows] = useState<KegiatanRow[]>(data);

  const handleToggle = (id: string, newValue: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: newValue } : r)));
  };

  const columns: ColumnDef<KegiatanRow>[] = [
    {
      accessorKey: 'id',
      header: ({ column }) => <SortableHeader column={column}>ID</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
          {row.original.id}
        </span>
      ),
      size: 90,
    },
    {
      accessorKey: 'nama',
      header: ({ column }) => <SortableHeader column={column}>Nama</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium line-clamp-1">
          {row.original.nama}
        </span>
      ),
    },
    {
      accessorKey: 'fase',
      header: 'Fase',
      cell: ({ row }) => (
        <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300">
          {row.original.fase}
        </Badge>
      ),
      size: 120,
    },
    {
      accessorKey: 'nilai',
      header: 'Nilai',
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.nilai}</span>
      ),
      size: 60,
    },
    {
      accessorKey: 'isGlobal',
      header: 'Scope',
      cell: ({ row }) => (
        <span className={`text-xs font-medium ${row.original.isGlobal ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {row.original.isGlobal ? 'Global' : 'Org'}
        </span>
      ),
      size: 70,
    },
    {
      accessorKey: 'displayOrder',
      header: ({ column }) => <SortableHeader column={column}>Order</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">{row.original.displayOrder}</span>
      ),
      size: 60,
    },
    {
      accessorKey: 'isActive',
      header: 'Aktif',
      cell: ({ row }) => (
        <ToggleActiveButton row={row.original} onToggle={handleToggle} />
      ),
      size: 70,
    },
  ];

  return <DataTable columns={columns} data={rows} searchKey="nama" searchPlaceholder="Cari nama kegiatan..." />;
}

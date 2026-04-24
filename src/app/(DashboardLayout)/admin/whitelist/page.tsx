'use client';

/**
 * /admin/whitelist
 * Manage whitelist entries.
 * Roles: SC, SUPERADMIN, PEMBINA (read); SC, SUPERADMIN (write)
 */

import { useEffect, useState, useCallback } from 'react';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ShieldCheck, Plus, Loader2, CheckCircle, Clock } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

const log = createLogger('admin-whitelist-page');

const ROLES = [
  'MABA', 'KP', 'KASUH', 'OC', 'ELDER', 'SC',
  'PEMBINA', 'BLM', 'SATGAS', 'ALUMNI', 'DOSEN_WALI',
] as const;

type PreassignRole = typeof ROLES[number];

interface WhitelistEntry {
  id: string;
  email: string;
  preassignedRole: string;
  isConsumed: boolean;
  consumedAt: string | null;
  note: string | null;
  createdAt: string;
  preassignedCohort: { code: string; name: string } | null;
}

export default function WhitelistPage() {
  const { user: viewer } = useAuth();
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConsumed, setShowConsumed] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const limit = 50;

  const canWrite = viewer?.role === 'SC' || viewer?.role === 'SUPERADMIN';

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        showConsumed: String(showConsumed),
      });
      log.info('Fetching whitelist', { page, showConsumed });
      const res = await fetch(`/api/admin/whitelist?${params}`);
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setEntries(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch (err) {
      log.error('Failed to fetch whitelist', { err });
      toast.error('Gagal memuat whitelist');
    } finally {
      setLoading(false);
    }
  }, [page, showConsumed]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const columns: ColumnDef<WhitelistEntry>[] = [
    {
      accessorKey: 'email',
      header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm font-mono">{row.original.email}</span>
      ),
    },
    {
      accessorKey: 'preassignedRole',
      header: 'Role',
      cell: ({ row }) => (
        <Badge className="text-xs bg-sky-100 text-sky-800 border-sky-300">
          {row.original.preassignedRole}
        </Badge>
      ),
    },
    {
      id: 'cohort',
      header: 'Kohort',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.preassignedCohort?.code ?? '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          {row.original.isConsumed ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-700">Digunakan</span>
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-amber-700">Menunggu</span>
            </>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'note',
      header: 'Catatan',
      cell: ({ row }) => (
        <span className="text-xs text-gray-500 italic">{row.original.note ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Ditambah',
      cell: ({ row }) => (
        <span className="text-xs text-gray-400">
          {new Date(row.original.createdAt).toLocaleDateString('id-ID')}
        </span>
      ),
    },
  ];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Whitelist Email
              {total > 0 && (
                <span className="ml-2 text-base font-normal text-gray-400">({total})</span>
              )}
            </h1>
            <p className="text-sm text-gray-500">Email yang diizinkan mendaftar ke sistem</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowConsumed(!showConsumed); setPage(1); }}
            className={showConsumed ? 'bg-sky-50 border-sky-300 text-sky-700' : ''}
          >
            {showConsumed ? 'Sembunyikan yang Digunakan' : 'Tampilkan Semua'}
          </Button>
          {canWrite && (
            <Button
              onClick={() => setAddOpen(true)}
              className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Email
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        {loading ? (
          <SkeletonTable rows={8} columns={5} />
        ) : (
          <DataTable
            columns={columns}
            data={entries}
            searchKey="email"
            searchPlaceholder="Cari email..."
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-gray-600">
            Halaman {page} dari {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}

      {canWrite && (
        <AddWhitelistDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onSuccess={fetchEntries}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add Whitelist Dialog                                                  */
/* ------------------------------------------------------------------ */

function AddWhitelistDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PreassignRole | ''>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email || !role) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          preassignedRole: role,
          note: note || undefined,
        }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success('Email berhasil ditambahkan ke whitelist');
      onOpenChange(false);
      setEmail('');
      setRole('');
      setNote('');
      onSuccess();
    } catch {
      toast.error('Gagal menambahkan email');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Email ke Whitelist</DialogTitle>
          <DialogDescription>
            Email yang ditambahkan dapat mendaftar ke sistem dengan role yang ditetapkan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="wl-email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="wl-email"
              type="email"
              placeholder="mahasiswa@its.ac.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="wl-role">
              Role <span className="text-red-500">*</span>
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as PreassignRole)}>
              <SelectTrigger id="wl-role">
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="wl-note">Catatan (opsional)</Label>
            <Input
              id="wl-note"
              placeholder="Catatan untuk entry ini"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!email || !role || submitting}
            className="bg-sky-500 hover:bg-sky-600 text-white"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Tambahkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

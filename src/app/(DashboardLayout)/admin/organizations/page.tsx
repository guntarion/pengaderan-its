'use client';

/**
 * /admin/organizations
 * SUPERADMIN — list and manage all organizations.
 * SC — redirected to own org detail.
 *
 * Phase RV-C — M01 Revisi Multi-HMJ
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Building2, AlertCircle, CheckCircle2, PauseCircle, Loader2 } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

const log = createLogger('admin-organizations-page');

interface OrgRow {
  id: string;
  code: string;
  name: string;
  fullName: string;
  slug: string;
  facultyCode: string | null;
  organizationType: string;
  registrationStatus: string;
  isActive: boolean;
  kahimaName: string | null;
  kajurName: string | null;
  createdAt: string;
}

const registrationStatusColor = (s: string) => {
  switch (s) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300';
    case 'SUSPENDED':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400';
  }
};

const orgTypeLabel = (t: string) => {
  switch (t) {
    case 'HMJ': return 'HMJ';
    case 'ALUMNI_CHAPTER': return 'Alumni Chapter';
    case 'INSTITUSI_PUSAT': return 'Institusi Pusat';
    default: return t;
  }
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function OrganizationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();

  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [filterFaculty, setFilterFaculty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Suspend dialog
  const [suspendTarget, setSuspendTarget] = useState<OrgRow | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  const isSuperadmin = user?.role === 'SUPERADMIN';

  const fetchOrgs = useCallback(async () => {
    try {
      log.info('Fetching organizations');
      const params = new URLSearchParams();
      if (filterFaculty !== 'all') params.set('facultyCode', filterFaculty);
      if (filterStatus !== 'all') params.set('registrationStatus', filterStatus);
      if (filterType !== 'all') params.set('organizationType', filterType);

      const res = await fetch(`/api/admin/organizations?${params.toString()}`);
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      const data: OrgRow[] = json.data ?? [];

      // SC: redirect to own org detail directly
      if (user?.role === 'SC' && data.length === 1) {
        router.replace(`/admin/organizations/${data[0].id}`);
        return;
      }

      setOrgs(data);
    } catch (err) {
      log.error('Failed to fetch organizations', { err });
      toast.error('Gagal memuat data organisasi');
    } finally {
      setLoading(false);
    }
  }, [filterFaculty, filterStatus, filterType, router, user?.role]);

  useEffect(() => {
    if (user) fetchOrgs();
  }, [user, fetchOrgs]);

  // Organizations stuck as PENDING > 7 days
  const stuckPending = orgs.filter(
    (o) =>
      o.registrationStatus === 'PENDING' &&
      Date.now() - new Date(o.createdAt).getTime() > SEVEN_DAYS_MS,
  );

  async function handleActivate(org: OrgRow) {
    const confirmed = await confirm({
      title: `Aktifkan ${org.code}?`,
      description: `Organisasi "${org.name}" akan diaktifkan. Pastikan semua persiapan sudah selesai.`,
      confirmLabel: 'Aktifkan',
    });
    if (!confirmed) return;

    setActionLoading(org.id);
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}/activate`, { method: 'POST' });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success(`${org.code} berhasil diaktifkan`);
      await fetchOrgs();
    } catch (err) {
      log.error('Failed to activate org', { err, orgId: org.id });
      toast.error('Gagal mengaktifkan organisasi');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSuspendSubmit() {
    if (!suspendTarget) return;
    if (suspendReason.trim().length < 10) {
      toast.error('Alasan suspensi minimal 10 karakter');
      return;
    }
    setSuspending(true);
    try {
      const res = await fetch(`/api/admin/organizations/${suspendTarget.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason.trim() }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success(`${suspendTarget.code} berhasil disuspen`);
      setSuspendTarget(null);
      setSuspendReason('');
      await fetchOrgs();
    } catch (err) {
      log.error('Failed to suspend org', { err, orgId: suspendTarget.id });
      toast.error('Gagal mensuspen organisasi');
    } finally {
      setSuspending(false);
    }
  }

  const columns: ColumnDef<OrgRow>[] = [
    {
      accessorKey: 'code',
      header: ({ column }) => <SortableHeader column={column}>Kode</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Nama</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{row.original.slug}</div>
        </div>
      ),
    },
    {
      accessorKey: 'facultyCode',
      header: 'Fakultas',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.facultyCode ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'organizationType',
      header: 'Tipe',
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {orgTypeLabel(row.original.organizationType)}
        </span>
      ),
    },
    {
      accessorKey: 'registrationStatus',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          className={`text-xs border ${registrationStatusColor(row.original.registrationStatus)}`}
        >
          {row.original.registrationStatus}
        </Badge>
      ),
    },
    {
      id: 'isActive',
      header: 'Aktif',
      cell: ({ row }) => (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            row.original.isActive
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {row.original.isActive ? 'Ya' : 'Tidak'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Dibuat',
      cell: ({ row }) => (
        <span className="text-xs text-gray-500">
          {new Date(row.original.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const org = row.original;
        const isLoading = actionLoading === org.id;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/organizations/${org.id}`)}
            >
              Detail
            </Button>
            {isSuperadmin && org.registrationStatus === 'PENDING' && (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700"
                onClick={() => handleActivate(org)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                )}
                Aktifkan
              </Button>
            )}
            {isSuperadmin && org.registrationStatus === 'SUSPENDED' && (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400"
                onClick={() => handleActivate(org)}
                disabled={isLoading}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Re-aktifkan
              </Button>
            )}
            {isSuperadmin && org.registrationStatus === 'ACTIVE' && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700"
                onClick={() => {
                  setSuspendTarget(org);
                  setSuspendReason('');
                }}
                disabled={isLoading}
              >
                <PauseCircle className="h-3.5 w-3.5 mr-1" />
                Suspen
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Toolbar: filter dropdowns
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {/* TODO(M02-RV-A): replace hardcoded faculty list with /api/faculties fetch */}
      <Select value={filterFaculty} onValueChange={setFilterFaculty}>
        <SelectTrigger className="w-40 text-sm">
          <SelectValue placeholder="Semua Fakultas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Fakultas</SelectItem>
          <SelectItem value="FSAD">FSAD</SelectItem>
          <SelectItem value="FTIRS">FTIRS</SelectItem>
          <SelectItem value="FT-SPK">FT-SPK</SelectItem>
          <SelectItem value="FTK">FTK</SelectItem>
          <SelectItem value="FT-EIC">FT-EIC</SelectItem>
          <SelectItem value="FDKBD">FDKBD</SelectItem>
          <SelectItem value="FV">FV</SelectItem>
          <SelectItem value="FKK">FKK</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-36 text-sm">
          <SelectValue placeholder="Semua Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Status</SelectItem>
          <SelectItem value="PENDING">PENDING</SelectItem>
          <SelectItem value="ACTIVE">ACTIVE</SelectItem>
          <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="w-40 text-sm">
          <SelectValue placeholder="Semua Tipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Tipe</SelectItem>
          <SelectItem value="HMJ">HMJ</SelectItem>
          <SelectItem value="ALUMNI_CHAPTER">Alumni Chapter</SelectItem>
          <SelectItem value="INSTITUSI_PUSAT">Institusi Pusat</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <SkeletonTable rows={5} columns={7} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Organisasi</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Kelola semua organisasi dalam sistem ({orgs.length} total)
            </p>
          </div>
        </div>
        {isSuperadmin && (
          <Button
            onClick={() => router.push('/admin/organizations/new')}
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Onboard HMJ Baru
          </Button>
        )}
      </div>

      {/* Stuck PENDING banner */}
      {isSuperadmin && stuckPending.length > 0 && (
        <Alert className="border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            <span className="font-semibold">{stuckPending.length} organisasi</span> masih berstatus
            PENDING lebih dari 7 hari:{' '}
            {stuckPending.map((o) => o.code).join(', ')}.{' '}
            <button
              className="underline font-medium hover:no-underline"
              onClick={() => setFilterStatus('PENDING')}
            >
              Tampilkan
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={orgs}
          searchKey="name"
          searchPlaceholder="Cari nama atau kode organisasi..."
          toolbar={toolbar}
        />
      </div>

      {/* Suspend dialog (custom — needs reason input) */}
      <Dialog
        open={!!suspendTarget}
        onOpenChange={(open) => {
          if (!open) {
            setSuspendTarget(null);
            setSuspendReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suspen Organisasi {suspendTarget?.code}</DialogTitle>
            <DialogDescription>
              Tindakan ini akan memaksa semua pengguna organisasi untuk login ulang. Masukkan
              alasan yang jelas (minimal 10 karakter).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="suspend-reason">Alasan Suspensi</Label>
              <Input
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Contoh: Pelanggaran SOP kegiatan..."
                className="rounded-xl"
              />
              <p className="text-xs text-gray-500">
                {suspendReason.trim().length}/10 karakter minimum
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSuspendTarget(null);
                setSuspendReason('');
              }}
              disabled={suspending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspendSubmit}
              disabled={suspending || suspendReason.trim().length < 10}
            >
              {suspending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Suspen Organisasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}

'use client';

/**
 * /admin/organizations/[id]
 * Organization detail page.
 * SUPERADMIN: any org. SC: own org only.
 *
 * Sections:
 * - Identitas (read-only fields; editable name/contact/leadership for mutable fields)
 * - Status workflow (Activate, Suspend)
 * - Settings placeholder (RV-E)
 * - Audit log link
 *
 * Phase RV-C — M01 Revisi Multi-HMJ
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2,
  Users,
  GitBranch,
  FileText,
  ArrowLeft,
  CheckCircle2,
  PauseCircle,
  ExternalLink,
  Pencil,
  Save,
  X,
  Loader2,
  Info,
  Lock,
} from 'lucide-react';

const log = createLogger('admin-org-detail');

interface OrgDetail {
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
  contactEmail: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { users: number; cohorts: number; paktaVersions: number };
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

// Edit form schema — only mutable fields
const editSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  fullName: z.string().min(5).max(300),
  kahimaName: z.string().max(100).optional().or(z.literal('')),
  kajurName: z.string().max(100).optional().or(z.literal('')),
  contactEmail: z.string().email('Email tidak valid').optional().or(z.literal('')),
});
type EditFormData = z.infer<typeof editSchema>;

function InfoRow({
  label,
  value,
  immutable,
  tooltip,
}: {
  label: string;
  value?: string | null;
  immutable?: boolean;
  tooltip?: string;
}) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-1.5 min-w-[160px]">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        {immutable && (
          <span title={tooltip ?? 'Field ini tidak dapat diubah setelah dibuat'}>
            <Lock className="h-3 w-3 text-gray-400" />
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-right flex-1 text-gray-800 dark:text-gray-200">
        {value ?? '—'}
      </span>
    </div>
  );
}

export default function OrgDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Suspend dialog
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  const isSuperadmin = user?.role === 'SUPERADMIN';
  const isSC = user?.role === 'SC';
  const canManage = isSuperadmin;
  const canEdit = isSuperadmin || (isSC && user?.organizationId === params.id);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: '',
      fullName: '',
      kahimaName: '',
      kajurName: '',
      contactEmail: '',
    },
  });

  const fetchOrg = useCallback(async () => {
    try {
      log.info('Fetching organization detail', { id: params.id });
      const res = await fetch(`/api/admin/organizations/${params.id}`);
      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        router.push('/admin/organizations');
        return;
      }
      const json = await res.json();
      const data: OrgDetail = json.data;
      setOrg(data);
      reset({
        name: data.name,
        fullName: data.fullName,
        kahimaName: data.kahimaName ?? '',
        kajurName: data.kajurName ?? '',
        contactEmail: data.contactEmail ?? '',
      });
    } catch (err) {
      log.error('Failed to fetch org detail', { err });
      toast.error('Gagal memuat data organisasi');
    } finally {
      setLoading(false);
    }
  }, [params.id, reset, router]);

  useEffect(() => {
    if (user) fetchOrg();
  }, [user, fetchOrg]);

  async function handleSaveEdit(data: EditFormData) {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/organizations/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          fullName: data.fullName,
          kahimaName: data.kahimaName || null,
          kajurName: data.kajurName || null,
          contactEmail: data.contactEmail || null,
        }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success('Perubahan berhasil disimpan');
      setEditing(false);
      await fetchOrg();
    } catch (err) {
      log.error('Failed to update org', { err });
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleActivate() {
    if (!org) return;
    const confirmed = await confirm({
      title: `Aktifkan ${org.code}?`,
      description:
        'Organisasi akan diaktifkan (PENDING → ACTIVE). SC Lead dapat mulai menggunakan sistem.',
      confirmLabel: 'Aktifkan',
    });
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}/activate`, { method: 'POST' });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success(`${org.code} berhasil diaktifkan`);
      await fetchOrg();
    } catch (err) {
      log.error('Failed to activate org', { err });
      toast.error('Gagal mengaktifkan organisasi');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSuspendSubmit() {
    if (!org) return;
    if (suspendReason.trim().length < 10) {
      toast.error('Alasan suspensi minimal 10 karakter');
      return;
    }
    setSuspending(true);
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason.trim() }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success(`${org.code} berhasil disuspen. Semua pengguna akan diminta login ulang.`);
      setSuspendOpen(false);
      setSuspendReason('');
      await fetchOrg();
    } catch (err) {
      log.error('Failed to suspend org', { err });
      toast.error('Gagal mensuspen organisasi');
    } finally {
      setSuspending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <SkeletonCard />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb labels={{ [params.id]: org.name }} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{org.name}</h1>
              <Badge
                className={`text-xs border ${registrationStatusColor(org.registrationStatus)}`}
              >
                {org.registrationStatus}
              </Badge>
              {!org.isActive && (
                <Badge className="text-xs border bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400">
                  Nonaktif
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {org.code} · slug: {org.slug}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/organizations')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-gray-400">Total Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-500" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {org._count.users}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-gray-400">Total Kohort</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-sky-500" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {org._count.cohorts}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-gray-400">Versi Pakta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-500" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {org._count.paktaVersions}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Identitas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Identitas Organisasi</h2>
              {canEdit && !editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
              {editing && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      reset({
                        name: org.name,
                        fullName: org.fullName,
                        kahimaName: org.kahimaName ?? '',
                        kajurName: org.kajurName ?? '',
                        contactEmail: org.contactEmail ?? '',
                      });
                    }}
                    disabled={savingEdit}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
                    onClick={handleSubmit(handleSaveEdit)}
                    disabled={savingEdit}
                  >
                    {savingEdit ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1" />
                    )}
                    Simpan
                  </Button>
                </div>
              )}
            </div>

            {/* Read-only / immutable fields */}
            <div className="space-y-0 mb-4">
              <InfoRow label="Kode" value={org.code} immutable tooltip="Kode tidak dapat diubah setelah dibuat" />
              <InfoRow label="Slug" value={org.slug} immutable tooltip="Slug tidak dapat diubah setelah dibuat" />
              <InfoRow
                label="Tipe"
                value={
                  org.organizationType === 'HMJ'
                    ? 'HMJ'
                    : org.organizationType === 'ALUMNI_CHAPTER'
                    ? 'Alumni Chapter'
                    : 'Institusi Pusat'
                }
                immutable
                tooltip="Tipe organisasi tidak dapat diubah"
              />
              <InfoRow label="Kode Fakultas" value={org.facultyCode} />
            </div>

            <Separator className="mb-4" />

            {/* Editable fields */}
            {!editing ? (
              <div className="space-y-0">
                <InfoRow label="Nama Singkat" value={org.name} />
                <InfoRow label="Nama Lengkap" value={org.fullName} />
                <InfoRow label="Kahima" value={org.kahimaName} />
                <InfoRow label="Kajur" value={org.kajurName} />
                <InfoRow label="Email Kontak" value={org.contactEmail} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">
                    Nama Singkat <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <Input {...field} className="rounded-xl" placeholder="Nama singkat organisasi" />
                    )}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="fullName"
                    render={({ field }) => (
                      <Input {...field} className="rounded-xl" placeholder="Nama lengkap organisasi" />
                    )}
                  />
                  {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">Nama Kahima</Label>
                  <Controller
                    control={control}
                    name="kahimaName"
                    render={({ field }) => (
                      <Input {...field} className="rounded-xl" placeholder="Opsional" />
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">Nama Kajur</Label>
                  <Controller
                    control={control}
                    name="kajurName"
                    render={({ field }) => (
                      <Input {...field} className="rounded-xl" placeholder="Opsional" />
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">Email Kontak</Label>
                  <Controller
                    control={control}
                    name="contactEmail"
                    render={({ field }) => (
                      <Input {...field} type="email" className="rounded-xl" placeholder="Opsional" />
                    )}
                  />
                  {errors.contactEmail && (
                    <p className="text-xs text-red-500">{errors.contactEmail.message}</p>
                  )}
                </div>
              </div>
            )}

            <Separator className="my-4" />
            <div className="flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500">
              <span>
                Dibuat:{' '}
                {new Date(org.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span>
                Diperbarui:{' '}
                {new Date(org.updatedAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Right — Status & Actions */}
        <div className="space-y-4">
          {/* Status card */}
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Status & Aksi</h2>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status saat ini:</span>
              <Badge
                className={`text-xs border ${registrationStatusColor(org.registrationStatus)}`}
              >
                {org.registrationStatus}
              </Badge>
            </div>

            {/* Status workflow description */}
            {org.registrationStatus === 'PENDING' && (
              <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Organisasi menunggu aktivasi SUPERADMIN sebelum dapat beroperasi.
              </div>
            )}
            {org.registrationStatus === 'SUSPENDED' && (
              <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Organisasi disuspen. Semua pengguna telah diminta login ulang.
              </div>
            )}

            {canManage && (
              <div className="space-y-2">
                {(org.registrationStatus === 'PENDING' ||
                  org.registrationStatus === 'SUSPENDED') && (
                  <Button
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                    onClick={handleActivate}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Aktifkan
                  </Button>
                )}
                {org.registrationStatus === 'ACTIVE' && (
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 rounded-xl"
                    onClick={() => {
                      setSuspendOpen(true);
                      setSuspendReason('');
                    }}
                    disabled={actionLoading}
                  >
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Suspen Organisasi
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Settings kohort */}
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Pengaturan Kohort
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Konfigurasi fase, plafon biaya, dan flag khusus untuk kohort aktif.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl"
              onClick={() => router.push('/admin/cohorts')}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Kelola Kohort
            </Button>
          </div>

          {/* Audit log link */}
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Audit Log</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Riwayat perubahan create, update, activate, suspend.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl"
              onClick={() =>
                router.push(`/admin/audit-log?orgId=${org.id}&resource=Organization`)
              }
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Lihat Audit Log
            </Button>
          </div>
        </div>
      </div>

      {/* Suspend dialog */}
      <Dialog
        open={suspendOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSuspendOpen(false);
            setSuspendReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suspen Organisasi {org.code}?</DialogTitle>
            <DialogDescription>
              Semua pengguna organisasi akan dipaksa login ulang (sessionEpoch++). Masukkan alasan
              suspensi yang jelas (minimal 10 karakter).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="detail-suspend-reason">Alasan Suspensi</Label>
              <Input
                id="detail-suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Contoh: Pelanggaran SOP kegiatan, pembekuan sementara..."
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
                setSuspendOpen(false);
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
              Suspen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}

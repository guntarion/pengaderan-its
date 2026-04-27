'use client';

/**
 * /admin/cohorts/[id]/settings
 * Edit Cohort.settings JSON — fase phases, plafon biaya, flags, custom.
 * Access: SUPERADMIN (any cohort) + SC (own org cohort only).
 *
 * Phase RV-E — M01 Revisi Multi-HMJ
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonForm } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { type CohortSettings } from '@/services/cohort.service';
import {
  ArrowLeft,
  CalendarRange,
  Wallet,
  ToggleLeft,
  Save,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';

const log = createLogger('cohort-settings-page');

// ---- Phase metadata ----

const FASE_META = [
  { phase: 'F0' as const, label: 'F0 — Foundation', description: 'Fase awal orientasi dan pengenalan' },
  { phase: 'F1' as const, label: 'F1 — Discovery', description: 'Fase eksplorasi diri dan lingkungan' },
  { phase: 'F2' as const, label: 'F2 — Challenge', description: 'Fase tantangan dan pengembangan' },
  { phase: 'F3' as const, label: 'F3 — Peak', description: 'Fase puncak dan ujian kompetensi' },
  { phase: 'F4' as const, label: 'F4 — Integration', description: 'Fase integrasi dan konsolidasi' },
];

// ---- Client-side form schema ----
// Uses date strings (YYYY-MM-DD) from <input type="date">, transformed to ISO datetime for API

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal: YYYY-MM-DD')
  .optional()
  .or(z.literal(''));

const faseFormSchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
});

const settingsFormSchema = z.object({
  fasePhases: z.object({
    F0: faseFormSchema,
    F1: faseFormSchema,
    F2: faseFormSchema,
    F3: faseFormSchema,
    F4: faseFormSchema,
  }),
  plafonBiaya: z.object({
    iuranKas: z.number({ invalid_type_error: 'Harus berupa angka' }).int().min(0, 'Tidak boleh negatif').optional().or(z.literal('' as unknown as undefined)),
    logistik: z.number({ invalid_type_error: 'Harus berupa angka' }).int().min(0, 'Tidak boleh negatif').optional().or(z.literal('' as unknown as undefined)),
  }),
  flags: z.object({
    allowOnlinePakta: z.boolean(),
    requireFotoMabaResmi: z.boolean(),
    enableTimeCapsule: z.boolean(),
  }),
  customJson: z.string().refine(
    (val) => {
      if (!val.trim()) return true;
      try { JSON.parse(val); return true; }
      catch { return false; }
    },
    { message: 'Format JSON tidak valid' }
  ),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

interface CohortInfo {
  id: string;
  code: string;
  name: string;
  organizationId: string;
}

// ---- Helpers ----

function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  // iso is full ISO datetime like 2026-01-01T00:00:00.000Z, extract date part
  return iso.slice(0, 10);
}

function toIsoDatetime(dateStr: string): string {
  // Convert YYYY-MM-DD to ISO 8601 datetime
  return `${dateStr}T00:00:00.000Z`;
}

function formatRupiah(n: number | undefined): string {
  if (n === undefined || n === null) return '';
  return n.toLocaleString('id-ID');
}

// ---- Component ----

export default function CohortSettingsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const [cohort, setCohort] = useState<CohortInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canEdit =
    user?.role === 'SUPERADMIN' ||
    (user?.role === 'SC' && cohort?.organizationId === user?.organizationId);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      fasePhases: {
        F0: { startDate: '', endDate: '' },
        F1: { startDate: '', endDate: '' },
        F2: { startDate: '', endDate: '' },
        F3: { startDate: '', endDate: '' },
        F4: { startDate: '', endDate: '' },
      },
      plafonBiaya: { iuranKas: undefined, logistik: undefined },
      flags: {
        allowOnlinePakta: false,
        requireFotoMabaResmi: false,
        enableTimeCapsule: false,
      },
      customJson: '',
    },
  });

  const fetchCohort = useCallback(async () => {
    try {
      log.info('Fetching cohort for settings', { id: params.id });
      const res = await fetch(`/api/admin/cohorts/${params.id}`);
      if (!res.ok) {
        toast.apiError(await res.json());
        router.push('/admin/cohorts');
        return;
      }
      const json = await res.json();
      const data = json.data;
      setCohort({ id: data.id, code: data.code, name: data.name, organizationId: data.organizationId });

      // Pre-fill form from persisted settings
      const s: CohortSettings | null = data.parsedSettings;

      // Build fasePhases map from array
      const faseMap: SettingsFormData['fasePhases'] = {
        F0: { startDate: '', endDate: '' },
        F1: { startDate: '', endDate: '' },
        F2: { startDate: '', endDate: '' },
        F3: { startDate: '', endDate: '' },
        F4: { startDate: '', endDate: '' },
      };
      if (s?.fasePhases) {
        for (const fp of s.fasePhases) {
          faseMap[fp.phase] = {
            startDate: toDateInput(fp.startDate),
            endDate: toDateInput(fp.endDate),
          };
        }
      }

      reset({
        fasePhases: faseMap,
        plafonBiaya: {
          iuranKas: s?.plafonBiaya?.iuranKas ?? undefined,
          logistik: s?.plafonBiaya?.logistik ?? undefined,
        },
        flags: {
          allowOnlinePakta: s?.flags?.allowOnlinePakta ?? false,
          requireFotoMabaResmi: s?.flags?.requireFotoMabaResmi ?? false,
          enableTimeCapsule: s?.flags?.enableTimeCapsule ?? false,
        },
        customJson: s?.custom ? JSON.stringify(s.custom, null, 2) : '',
      });
    } catch (err) {
      log.error('Failed to fetch cohort', { err });
      toast.error('Gagal memuat data kohort');
    } finally {
      setLoading(false);
    }
  }, [params.id, reset, router]);

  useEffect(() => {
    if (user) fetchCohort();
  }, [user, fetchCohort]);

  async function onSubmit(data: SettingsFormData) {
    if (!canEdit) return;
    setSaving(true);
    try {
      // Transform form data to CohortSettings API shape
      const fasePhases: CohortSettings['fasePhases'] = [];
      for (const meta of FASE_META) {
        const fp = data.fasePhases[meta.phase];
        if (fp.startDate && fp.endDate) {
          fasePhases.push({
            phase: meta.phase,
            startDate: toIsoDatetime(fp.startDate),
            endDate: toIsoDatetime(fp.endDate),
          });
        }
      }

      // Validate date continuity (end > start per phase)
      for (const fp of fasePhases) {
        if (new Date(fp.endDate) <= new Date(fp.startDate)) {
          toast.error(`Fase ${fp.phase}: Tanggal selesai harus setelah tanggal mulai`);
          return;
        }
      }

      // Validate phase continuity (phase N start >= phase N-1 end)
      for (let i = 1; i < fasePhases.length; i++) {
        const prev = fasePhases[i - 1];
        const curr = fasePhases[i];
        if (new Date(curr.startDate) < new Date(prev.endDate)) {
          toast.error(
            `Fase ${curr.phase} mulai sebelum Fase ${prev.phase} selesai — periksa urutan tanggal`
          );
          return;
        }
      }

      // Parse custom JSON
      let custom: Record<string, unknown> | undefined;
      if (data.customJson.trim()) {
        try {
          custom = JSON.parse(data.customJson) as Record<string, unknown>;
        } catch {
          toast.error('Format JSON custom tidak valid');
          return;
        }
      }

      const payload: CohortSettings = {
        fasePhases: fasePhases.length > 0 ? fasePhases : undefined,
        plafonBiaya:
          data.plafonBiaya.iuranKas !== undefined || data.plafonBiaya.logistik !== undefined
            ? {
                iuranKas: data.plafonBiaya.iuranKas ?? undefined,
                logistik: data.plafonBiaya.logistik ?? undefined,
              }
            : undefined,
        flags: {
          allowOnlinePakta: data.flags.allowOnlinePakta,
          requireFotoMabaResmi: data.flags.requireFotoMabaResmi,
          enableTimeCapsule: data.flags.enableTimeCapsule,
        },
        custom,
      };

      log.info('Saving cohort settings', { cohortId: params.id });

      const res = await fetch(`/api/admin/cohorts/${params.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }

      toast.success('Pengaturan kohort berhasil disimpan');
      // Re-fetch to get fresh persisted state
      await fetchCohort();
    } catch (err) {
      log.error('Failed to save cohort settings', { err });
      toast.error('Gagal menyimpan pengaturan kohort');
    } finally {
      setSaving(false);
    }
  }

  // ---- Loading ----
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <SkeletonForm fields={6} />
      </div>
    );
  }

  if (!cohort) return null;

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb
        labels={{
          [params.id]: cohort.name,
          settings: 'Pengaturan',
        }}
      />

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Pengaturan Kohort
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {cohort.code} — {cohort.name}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/cohorts/${params.id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Detail
        </Button>
      </div>

      {/* Role warning */}
      {!canEdit && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Anda tidak memiliki akses untuk mengubah pengaturan kohort ini. Hanya SUPERADMIN atau SC dari
            organisasi ini yang dapat melakukan perubahan.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section: Fase Phases */}
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-sky-500" />
              <CardTitle className="text-base">Durasi 5 Fase Kaderisasi</CardTitle>
            </div>
            <CardDescription>
              Atur tanggal mulai dan selesai untuk tiap fase. Kosongkan fase yang belum
              dijadwalkan. Fase harus berurutan (F0 selesai sebelum F1 mulai, dst.).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {FASE_META.map((meta) => (
              <div
                key={meta.phase}
                className="p-4 rounded-xl border border-sky-100 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-900/10 space-y-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {meta.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{meta.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Controller
                    control={control}
                    name={`fasePhases.${meta.phase}.startDate`}
                    render={({ field }) => (
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600 dark:text-gray-400">
                          Tanggal Mulai
                        </Label>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ''}
                          disabled={!canEdit}
                          className="rounded-xl text-sm"
                        />
                        {errors.fasePhases?.[meta.phase]?.startDate && (
                          <p className="text-xs text-red-500">
                            {errors.fasePhases[meta.phase]?.startDate?.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                  <Controller
                    control={control}
                    name={`fasePhases.${meta.phase}.endDate`}
                    render={({ field }) => (
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600 dark:text-gray-400">
                          Tanggal Selesai
                        </Label>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ''}
                          disabled={!canEdit}
                          className="rounded-xl text-sm"
                          min={watch(`fasePhases.${meta.phase}.startDate`) || undefined}
                        />
                        {errors.fasePhases?.[meta.phase]?.endDate && (
                          <p className="text-xs text-red-500">
                            {errors.fasePhases[meta.phase]?.endDate?.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section: Plafon Biaya */}
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-sky-500" />
              <CardTitle className="text-base">Plafon Biaya</CardTitle>
            </div>
            <CardDescription>
              Batas anggaran per-item dalam Rupiah. Kosongkan jika tidak ada plafon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                control={control}
                name="plafonBiaya.iuranKas"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-700 dark:text-gray-300">
                      Iuran Kas (Rp)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium select-none">
                        Rp
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : parseInt(val, 10));
                        }}
                        disabled={!canEdit}
                        className="rounded-xl pl-8 text-sm"
                        placeholder="Contoh: 150000"
                      />
                    </div>
                    {field.value !== undefined && field.value >= 0 && (
                      <p className="text-xs text-gray-400">{formatRupiah(field.value as number)}</p>
                    )}
                    {errors.plafonBiaya?.iuranKas && (
                      <p className="text-xs text-red-500">{errors.plafonBiaya.iuranKas.message}</p>
                    )}
                  </div>
                )}
              />

              <Controller
                control={control}
                name="plafonBiaya.logistik"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-700 dark:text-gray-300">
                      Logistik (Rp)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium select-none">
                        Rp
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : parseInt(val, 10));
                        }}
                        disabled={!canEdit}
                        className="rounded-xl pl-8 text-sm"
                        placeholder="Contoh: 500000"
                      />
                    </div>
                    {field.value !== undefined && field.value >= 0 && (
                      <p className="text-xs text-gray-400">{formatRupiah(field.value as number)}</p>
                    )}
                    {errors.plafonBiaya?.logistik && (
                      <p className="text-xs text-red-500">{errors.plafonBiaya.logistik.message}</p>
                    )}
                  </div>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section: Flags */}
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ToggleLeft className="h-4 w-4 text-sky-500" />
              <CardTitle className="text-base">Flag Operasional</CardTitle>
            </div>
            <CardDescription>
              Aktifkan atau nonaktifkan fitur-fitur khusus untuk kohort ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                name: 'flags.allowOnlinePakta' as const,
                label: 'Izinkan Pakta Online',
                description: 'MABA dapat menandatangani pakta secara online tanpa kehadiran fisik.',
              },
              {
                name: 'flags.requireFotoMabaResmi' as const,
                label: 'Foto MABA Resmi Wajib',
                description: 'MABA diwajibkan mengunggah foto resmi sebelum mengakses fitur tertentu.',
              },
              {
                name: 'flags.enableTimeCapsule' as const,
                label: 'Aktifkan Time Capsule',
                description: 'Fitur Life Map & Time Capsule tersedia untuk MABA dalam kohort ini.',
              },
            ].map((flag) => (
              <Controller
                key={flag.name}
                control={control}
                name={flag.name}
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {flag.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {flag.description}
                      </p>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canEdit}
                    />
                  </div>
                )}
              />
            ))}
          </CardContent>
        </Card>

        {/* Section: Custom JSON */}
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Custom (Advanced)</CardTitle>
            <CardDescription>
              Data tambahan dalam format JSON untuk keperluan khusus. Kosongkan jika tidak
              diperlukan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2 p-3 mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-xs text-blue-700 dark:text-blue-400">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Gunakan field ini untuk menyimpan metadata tambahan yang tidak tercakup di field
                di atas. Contoh: <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{"{ \"kuotaMaba\": 150, \"namaRektor\": \"Prof. X\" }"}</code>
              </span>
            </div>
            <Controller
              control={control}
              name="customJson"
              render={({ field }) => (
                <div className="space-y-1">
                  <textarea
                    {...field}
                    rows={5}
                    disabled={!canEdit}
                    placeholder={'{\n  "key": "value"\n}'}
                    className="w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm font-mono resize-y disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {errors.customJson && (
                    <p className="text-xs text-red-500">{errors.customJson.message}</p>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        {canEdit && (
          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isDirty
                ? 'Ada perubahan yang belum disimpan'
                : 'Semua perubahan tersimpan'}
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/admin/cohorts/${params.id}`)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

'use client';

/**
 * /dashboard/safeguard/incidents/new
 * NAWASENA M10 — F2 Full incident report form.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SeverityLegend } from '@/components/safeguard/SeverityLegend';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

const log = createLogger('safeguard-new-incident-page');

const formSchema = z.object({
  type: z.string().min(1, 'Pilih jenis insiden'),
  severity: z.string().min(1, 'Pilih tingkat keparahan'),
  occurredAt: z.string().min(1, 'Tentukan waktu kejadian'),
  cohortId: z.string().min(1, 'Pilih angkatan'),
  affectedUserId: z.string().optional(),
  actionTaken: z.string().max(5000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const INCIDENT_TYPES = [
  { value: 'SAFE_WORD', label: 'Safe Word' },
  { value: 'MEDICAL', label: 'Kondisi Medis' },
  { value: 'INJURY', label: 'Cedera Fisik' },
  { value: 'SHUTDOWN', label: 'Shutdown / Tidak Dapat Melanjutkan' },
  { value: 'CONFLICT', label: 'Konflik antar Peserta' },
  { value: 'HARASSMENT', label: 'Pelecehan / Intimidasi' },
  { value: 'OTHER', label: 'Lainnya' },
];

const SEVERITY_OPTIONS = [
  {
    value: 'RED',
    label: 'KRITIS (RED)',
    description: 'Mengancam keselamatan segera. Eskalasi dalam 30 menit.',
    class: 'border-red-300 text-red-800',
  },
  {
    value: 'YELLOW',
    label: 'SEDANG (YELLOW)',
    description: 'Perlu tindak lanjut dalam 24 jam.',
    class: 'border-amber-300 text-amber-800',
  },
  {
    value: 'GREEN',
    label: 'RINGAN (GREEN)',
    description: 'Insiden minor, tidak darurat.',
    class: 'border-emerald-300 text-emerald-800',
  },
];

export default function NewIncidentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      occurredAt: new Date().toISOString().slice(0, 16), // datetime-local format
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    log.info('Submitting incident form', { type: values.type, severity: values.severity });

    try {
      const res = await fetch('/api/safeguard/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          occurredAt: new Date(values.occurredAt).toISOString(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Gagal membuat laporan insiden');
      }

      const { id } = json.data;
      log.info('Incident created', { id });
      toast.success('Laporan insiden berhasil dibuat');
      router.push(`/dashboard/safeguard/incidents/${id}`);
    } catch (err) {
      log.error('Failed to create incident', { error: err });
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <DynamicBreadcrumb
        labels={{ safeguard: 'Safeguard', incidents: 'Insiden', new: 'Lapor Insiden Baru' }}
      />

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Laporan Insiden Baru
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Isi form F2 — Laporan Insiden Lengkap
          </p>
          <SeverityLegend />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Type */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Jenis Insiden <span className="text-red-500">*</span>
          </Label>
          <Select
            value={form.watch('type')}
            onValueChange={(v) => form.setValue('type', v)}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Pilih jenis insiden..." />
            </SelectTrigger>
            <SelectContent>
              {INCIDENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.type && (
            <p className="text-xs text-red-500">{form.formState.errors.type.message}</p>
          )}
        </div>

        {/* Severity */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tingkat Keparahan <span className="text-red-500">*</span>
          </Label>
          <div className="grid gap-2">
            {SEVERITY_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => form.setValue('severity', s.value)}
                className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  form.watch('severity') === s.value
                    ? `${s.class} bg-opacity-10`
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${
                  form.watch('severity') === s.value ? 'border-current bg-current' : 'border-gray-400'
                }`} />
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.description}</p>
                </div>
              </button>
            ))}
          </div>
          {form.formState.errors.severity && (
            <p className="text-xs text-red-500">{form.formState.errors.severity.message}</p>
          )}
        </div>

        {/* Occurred At */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Waktu Kejadian <span className="text-red-500">*</span>
          </Label>
          <input
            type="datetime-local"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            {...form.register('occurredAt')}
          />
          {form.formState.errors.occurredAt && (
            <p className="text-xs text-red-500">{form.formState.errors.occurredAt.message}</p>
          )}
        </div>

        {/* Cohort ID */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ID Angkatan <span className="text-red-500">*</span>
          </Label>
          <input
            type="text"
            placeholder="Masukkan ID angkatan..."
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            {...form.register('cohortId')}
          />
          {form.formState.errors.cohortId && (
            <p className="text-xs text-red-500">{form.formState.errors.cohortId.message}</p>
          )}
        </div>

        {/* Affected User ID (optional) */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ID Peserta Terdampak (opsional)
          </Label>
          <input
            type="text"
            placeholder="Masukkan ID user peserta yang terdampak..."
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            {...form.register('affectedUserId')}
          />
        </div>

        {/* Action Taken */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tindakan yang Sudah Diambil (opsional)
          </Label>
          <textarea
            rows={4}
            placeholder="Jelaskan tindakan pertolongan pertama atau tindakan yang sudah dilakukan..."
            className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            {...form.register('actionTaken')}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => router.back()}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-sky-500 text-white hover:bg-sky-600"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Kirim Laporan'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

'use client';

/**
 * src/components/event-execution/CreateInstanceWizard.tsx
 * NAWASENA M08 — 3-step wizard for creating a KegiatanInstance from master.
 *
 * Step 1: Pick Kegiatan (KegiatanPicker)
 * Step 2: Preview auto-prefill (AutoPrefillPreview)
 * Step 3: Fill instance details (form)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInstanceSchema, type CreateInstanceInput } from '@/lib/event-execution/schemas';
import { KegiatanPicker } from './KegiatanPicker';
import { AutoPrefillPreview } from './AutoPrefillPreview';
import { toast } from '@/lib/toast';
import { Loader2, ArrowRightIcon, ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface KegiatanOption {
  id: string;
  nama: string;
  deskripsiSingkat: string;
  fase: string;
  kategori: string;
  intensity: string;
  picRoleHint: string | null;
}

const STEPS = ['Pilih Kegiatan', 'Preview', 'Isi Detail'] as const;

export function CreateInstanceWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedKegiatan, setSelectedKegiatan] = useState<KegiatanOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateInstanceInput>({
    resolver: zodResolver(createInstanceSchema),
    defaultValues: {
      scheduledAt: '',
      location: '',
      capacity: undefined,
    },
  });

  const kegiatanId = watch('kegiatanId');

  const handleKegiatanSelect = (id: string | null, kegiatan: KegiatanOption | null) => {
    setValue('kegiatanId', id ?? '');
    setSelectedKegiatan(kegiatan);
  };

  const onSubmit = async (data: CreateInstanceInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/event-execution/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.apiError(json);
        return;
      }
      toast.success('Sesi kegiatan berhasil dibuat!');
      router.push(`/dashboard/oc/kegiatan/${json.data.id}`);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                i === step
                  ? 'bg-sky-500 text-white'
                  : i < step
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs ${
                i === step ? 'text-sky-700 dark:text-sky-300 font-medium' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-gray-200 dark:bg-gray-700" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Pick Kegiatan */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Pilih Kegiatan Master
            </Label>
            <KegiatanPicker
              value={kegiatanId ?? null}
              onChange={handleKegiatanSelect}
            />
            {errors.kegiatanId && (
              <p className="text-xs text-red-500 mt-1">{errors.kegiatanId.message}</p>
            )}
          </div>

          {selectedKegiatan && (
            <div className="bg-sky-50 dark:bg-sky-950/20 rounded-xl border border-sky-100 dark:border-sky-900 p-3">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{selectedKegiatan.nama}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {selectedKegiatan.deskripsiSingkat}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setStep(1)}
              disabled={!kegiatanId}
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
            >
              Lanjut <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Preview prefill */}
      {step === 1 && (
        <div className="space-y-4">
          <AutoPrefillPreview kegiatanId={kegiatanId ?? null} />

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(0)}
              className="rounded-xl"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" /> Kembali
            </Button>
            <Button
              type="button"
              onClick={() => setStep(2)}
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
            >
              Isi Detail <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Fill instance details */}
      {step === 2 && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Tanggal & Waktu Jadwal <span className="text-red-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                {...register('scheduledAt')}
                className="rounded-xl border-gray-200 dark:border-gray-700"
              />
              {errors.scheduledAt && (
                <p className="text-xs text-red-500 mt-1">{errors.scheduledAt.message}</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Kapasitas (opsional)
              </Label>
              <Input
                type="number"
                placeholder="Kosongkan = tidak terbatas"
                {...register('capacity', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                className="rounded-xl border-gray-200 dark:border-gray-700"
              />
              {errors.capacity && (
                <p className="text-xs text-red-500 mt-1">{errors.capacity.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              Lokasi / Link <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Nama tempat atau URL meet/zoom"
              {...register('location')}
              className="rounded-xl border-gray-200 dark:border-gray-700"
            />
            {errors.location && (
              <p className="text-xs text-red-500 mt-1">{errors.location.message}</p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              Link Materi (opsional)
            </Label>
            <Input
              type="url"
              placeholder="https://..."
              {...register('materiLinkUrl')}
              className="rounded-xl border-gray-200 dark:border-gray-700"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              Catatan Panitia (internal)
            </Label>
            <Textarea
              placeholder="Catatan internal OC/SC, tidak terlihat Maba"
              rows={3}
              {...register('notesPanitia')}
              className="rounded-xl border-gray-200 dark:border-gray-700 resize-none"
            />
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="rounded-xl"
              disabled={isSubmitting}
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" /> Kembali
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Menyimpan...' : 'Buat Sesi Kegiatan'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

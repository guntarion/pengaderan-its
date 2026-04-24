'use client';

/**
 * src/components/life-map/LifeMapGoalForm.tsx
 * NAWASENA M07 — SMART goal form for creating/editing Life Map goals.
 *
 * Uses FormWrapper + FormInput + FormTextarea pattern.
 */

import { useState } from 'react';
import { FormWrapper, FormInput, FormTextarea } from '@/components/shared/FormWrapper';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { z } from 'zod';
import { LifeArea } from '@prisma/client';
import type { Control } from 'react-hook-form';

const goalSchema = z.object({
  area: z.nativeEnum(LifeArea, { required_error: 'Pilih area kehidupan' }),
  goalText: z.string().min(20, 'Minimal 20 karakter').max(500, 'Maks 500 karakter'),
  metric: z.string().min(10, 'Minimal 10 karakter').max(200, 'Maks 200 karakter'),
  whyMatters: z.string().min(20, 'Minimal 20 karakter').max(300, 'Maks 300 karakter'),
  deadline: z.string().refine((d) => {
    const date = new Date(d);
    const minDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return date >= minDate;
  }, 'Deadline minimal 30 hari dari hari ini'),
  achievabilityNote: z.string().max(200).optional().or(z.literal('')),
});

type GoalFormValues = z.infer<typeof goalSchema>;

const AREA_OPTIONS = [
  { value: 'PERSONAL_GROWTH', label: '🌱 Kepribadian & Pertumbuhan' },
  { value: 'STUDI_KARIR', label: '📚 Studi & Karir' },
  { value: 'FINANSIAL', label: '💰 Finansial' },
  { value: 'KESEHATAN', label: '💪 Kesehatan' },
  { value: 'SOSIAL', label: '🤝 Sosial & Komunitas' },
  { value: 'KELUARGA', label: '🏡 Keluarga & Relasi' },
];

export interface GoalFormSubmitValues extends GoalFormValues {
  sharedWithKasuh: boolean;
}

interface LifeMapGoalFormProps {
  initialValues?: Partial<GoalFormSubmitValues>;
  defaultArea?: LifeArea;
  onSubmit: (values: GoalFormSubmitValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  disabled?: boolean;
}

// Inner component that receives control from FormWrapper
function GoalFormInner({
  control,
}: {
  control: Control<GoalFormValues>;
}) {
  return (
    <>
      {/* Area select */}
      <FormField
        control={control}
        name="area"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Area Kehidupan <span className="text-red-500">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="rounded-xl border-sky-200 dark:border-sky-800">
                  <SelectValue placeholder="Pilih area..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {AREA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Goal text */}
      <FormTextarea
        control={control}
        name="goalText"
        label="Deskripsi Goal (SMART)"
        placeholder="Contoh: Meningkatkan IPK dari 3.2 menjadi 3.7 pada akhir semester genap 2026..."
        rows={4}
        description="20–500 karakter. Gunakan format SMART: Spesifik, Terukur, Dapat Dicapai, Relevan, Terikat Waktu"
      />

      {/* Metric */}
      <FormTextarea
        control={control}
        name="metric"
        label="Ukuran Keberhasilan"
        placeholder="Contoh: IPK ≥ 3.7 pada transkrip semester genap 2026"
        rows={2}
        description="10–200 karakter. Bagaimana kamu tahu goal ini tercapai?"
      />

      {/* Why matters */}
      <FormTextarea
        control={control}
        name="whyMatters"
        label="Mengapa Goal ini Penting?"
        placeholder="Contoh: Meningkatkan IPK akan membuka peluang beasiswa dan magang di perusahaan impian..."
        rows={3}
        description="20–300 karakter. Motivasi dan relevansi personal"
      />

      {/* Deadline */}
      <FormInput
        control={control}
        name="deadline"
        label="Target Deadline"
        type="date"
        description="Minimal 30 hari dari hari ini"
      />

      {/* Achievability note (optional) */}
      <FormTextarea
        control={control}
        name="achievabilityNote"
        label="Catatan Keterjangkauan (opsional)"
        placeholder="Apa sumber daya atau dukungan yang kamu miliki untuk mencapai goal ini?"
        rows={2}
        description="Maks 200 karakter"
      />
    </>
  );
}

export function LifeMapGoalForm({
  initialValues,
  defaultArea,
  onSubmit,
  onCancel,
  submitLabel = 'Simpan Goal',
  disabled = false,
}: LifeMapGoalFormProps) {
  const [sharedWithKasuh, setSharedWithKasuh] = useState(initialValues?.sharedWithKasuh ?? false);

  const defaults: Partial<GoalFormValues> = {
    area: defaultArea ?? initialValues?.area,
    goalText: initialValues?.goalText ?? '',
    metric: initialValues?.metric ?? '',
    whyMatters: initialValues?.whyMatters ?? '',
    deadline: initialValues?.deadline ?? '',
    achievabilityNote: initialValues?.achievabilityNote ?? '',
  };

  const handleSubmit = async (values: GoalFormValues) => {
    await onSubmit({ ...values, sharedWithKasuh });
  };

  return (
    <div className="space-y-4">
      <FormWrapper
        schema={goalSchema}
        defaultValues={defaults as GoalFormValues}
        onSubmit={handleSubmit}
        submitLabel={submitLabel}
        onCancel={onCancel}
        cancelLabel="Batal"
      >
        {({ control }) => <GoalFormInner control={control} />}
      </FormWrapper>

      {/* Share toggle — outside FormWrapper to manage separately */}
      <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-900/10 rounded-xl border border-sky-100 dark:border-sky-900">
        <input
          type="checkbox"
          id="sharedWithKasuh"
          checked={sharedWithKasuh}
          onChange={(e) => setSharedWithKasuh(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 rounded accent-sky-500"
        />
        <label htmlFor="sharedWithKasuh" className="cursor-pointer select-none">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Bagikan ke Kakak Kasuh
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kakak Kasuhmu dapat melihat dan mendukung perjalananmu
          </p>
        </label>
      </div>
    </div>
  );
}

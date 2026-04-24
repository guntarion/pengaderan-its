'use client';

/**
 * src/components/life-map/MilestoneUpdateForm.tsx
 * NAWASENA M07 — Form for submitting/editing a milestone progress update.
 */

import { useState } from 'react';
import { FormWrapper, FormTextarea } from '@/components/shared/FormWrapper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { z } from 'zod';
import { LifeMapStatus } from '@prisma/client';
import type { Control } from 'react-hook-form';

type MilestoneKey = 'M1' | 'M2' | 'M3';

const updateSchema = z.object({
  progressText: z.string().min(50, 'Minimal 50 karakter').max(1000, 'Maks 1000 karakter'),
  reflectionText: z.string().min(50, 'Minimal 50 karakter').max(1000, 'Maks 1000 karakter'),
});

type UpdateFormValues = z.infer<typeof updateSchema>;

const MILESTONE_LABELS: Record<MilestoneKey, string> = {
  M1: 'M1 — Update Awal',
  M2: 'M2 — Update Tengah',
  M3: 'M3 — Update Akhir',
};

export interface MilestoneUpdateFormValues extends UpdateFormValues {
  progressPercent: number;
  newStatus?: LifeMapStatus;
}

interface MilestoneUpdateFormProps {
  milestone: MilestoneKey;
  isEdit?: boolean;
  initialValues?: Partial<MilestoneUpdateFormValues>;
  onSubmit: (values: MilestoneUpdateFormValues) => Promise<void>;
  onCancel?: () => void;
}

function FormInner({
  control,
  progressPercent,
  onPercentChange,
  newStatus,
  onStatusChange,
}: {
  control: Control<UpdateFormValues>;
  progressPercent: number;
  onPercentChange: (v: number) => void;
  newStatus: LifeMapStatus | undefined;
  onStatusChange: (v: LifeMapStatus | undefined) => void;
}) {
  return (
    <>
      {/* Progress text */}
      <FormTextarea
        control={control}
        name="progressText"
        label="Bagaimana perkembanganmu?"
        placeholder="Ceritakan progres yang sudah kamu capai sejak milestone terakhir. Apa yang sudah berhasil? Apa yang masih dalam proses?"
        rows={5}
        description="50–1000 karakter"
      />

      {/* Progress percent slider */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Persentase Pencapaian
        </label>
        <div className="flex items-center gap-4">
          <Slider
            min={0}
            max={100}
            step={5}
            value={[progressPercent]}
            onValueChange={(v) => onPercentChange(v[0])}
            className="flex-1"
          />
          <span className="text-sm font-semibold text-sky-600 dark:text-sky-400 w-12 text-right">
            {progressPercent}%
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Estimasi persentase pencapaian goal ini
        </p>
      </div>

      {/* Reflection text */}
      <FormTextarea
        control={control}
        name="reflectionText"
        label="Refleksi & Pelajaran"
        placeholder="Apa yang kamu pelajari? Hambatan apa yang dihadapi? Bagaimana kamu mengatasinya?"
        rows={5}
        description="50–1000 karakter"
      />

      {/* Status change (optional) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Perbarui Status Goal (opsional)
        </label>
        <Select
          value={newStatus ?? ''}
          onValueChange={(v) => onStatusChange(v ? (v as LifeMapStatus) : undefined)}
        >
          <SelectTrigger className="rounded-xl border-sky-200 dark:border-sky-800">
            <SelectValue placeholder="Jangan ubah status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Jangan ubah status</SelectItem>
            <SelectItem value="ACHIEVED">Tercapai — Goal berhasil dicapai!</SelectItem>
            <SelectItem value="ADJUSTED">Direvisi — Goal perlu disesuaikan</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ubah hanya jika goal sudah tercapai atau perlu direvisi secara material
        </p>
      </div>
    </>
  );
}

export function MilestoneUpdateForm({
  milestone,
  isEdit = false,
  initialValues,
  onSubmit,
  onCancel,
}: MilestoneUpdateFormProps) {
  const [progressPercent, setProgressPercent] = useState(initialValues?.progressPercent ?? 0);
  const [newStatus, setNewStatus] = useState<LifeMapStatus | undefined>(initialValues?.newStatus);

  const handleSubmit = async (values: UpdateFormValues) => {
    await onSubmit({ ...values, progressPercent, newStatus });
  };

  return (
    <div className="space-y-2">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {MILESTONE_LABELS[milestone]}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isEdit ? 'Edit update yang sudah ada' : 'Isi progress update untuk milestone ini'}
        </p>
      </div>

      <FormWrapper
        schema={updateSchema}
        defaultValues={{
          progressText: initialValues?.progressText ?? '',
          reflectionText: initialValues?.reflectionText ?? '',
        }}
        onSubmit={handleSubmit}
        submitLabel={isEdit ? 'Simpan Perubahan' : 'Kirim Update'}
        onCancel={onCancel}
        cancelLabel="Batal"
      >
        {({ control }) => (
          <FormInner
            control={control}
            progressPercent={progressPercent}
            onPercentChange={setProgressPercent}
            newStatus={newStatus}
            onStatusChange={setNewStatus}
          />
        )}
      </FormWrapper>
    </div>
  );
}

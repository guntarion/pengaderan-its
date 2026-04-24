'use client';

/**
 * /admin/cohorts/new
 * SC, SUPERADMIN — create a new cohort.
 */

import { useRouter } from 'next/navigation';
import { FormWrapper, FormInput } from '@/components/shared/FormWrapper';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { Users2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from '@/lib/toast';

const schema = z.object({
  code: z.string().min(1).max(20, 'Maksimal 20 karakter'),
  name: z.string().min(2).max(200),
  startDate: z.string().min(1, 'Tanggal mulai diperlukan'),
  endDate: z.string().min(1, 'Tanggal selesai diperlukan'),
});

type FormData = z.infer<typeof schema>;

export default function NewCohortPage() {
  const router = useRouter();

  const handleSubmit = async (data: FormData) => {
    // Convert date strings (YYYY-MM-DD) to ISO 8601 datetime
    const res = await fetch('/api/admin/cohorts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: data.code,
        name: data.name,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      }),
    });
    if (!res.ok) throw await res.json();
    toast.success('Kohort berhasil dibuat');
    router.push('/admin/cohorts');
  };

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Users2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tambah Kohort</h1>
          <p className="text-sm text-gray-500">Buat kohort baru untuk angkatan</p>
        </div>
      </div>

      <div className="max-w-3xl rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <FormWrapper<FormData>
          schema={schema}
          defaultValues={{
            code: '',
            name: '',
            startDate: '',
            endDate: '',
          }}
          onSubmit={handleSubmit}
          submitLabel="Buat Kohort"
          onCancel={() => router.push('/admin/cohorts')}
        >
          {({ control }) => (
            <>
              <FormInput
                control={control}
                name="code"
                label="Kode Kohort"
                placeholder="C26"
                description="Kode unik kohort. Contoh: C26 untuk angkatan 2026"
              />
              <FormInput
                control={control}
                name="name"
                label="Nama Kohort"
                placeholder="NAWASENA 2026"
              />
              <FormInput
                control={control}
                name="startDate"
                label="Tanggal Mulai"
                type="date"
                description="Tanggal dimulainya periode kohort ini"
              />
              <FormInput
                control={control}
                name="endDate"
                label="Tanggal Selesai"
                type="date"
                description="Tanggal berakhirnya periode kohort ini"
              />
            </>
          )}
        </FormWrapper>
      </div>
    </div>
  );
}

'use client';

/**
 * /admin/struktur/kp-group/new
 * SC/OC/SUPERADMIN — buat KP Group baru.
 */

import { useRouter } from 'next/navigation';
import { FormWrapper, FormInput } from '@/components/shared/FormWrapper';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { Network } from 'lucide-react';
import { createKPGroupSchema } from '@/lib/schemas/kp-group';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin-kp-group-new');

type FormData = {
  cohortId: string;
  code: string;
  name: string;
  kpCoordinatorUserId: string;
  capacityTarget: number;
  capacityMax: number;
};

export default function NewKPGroupPage() {
  const router = useRouter();

  async function handleSubmit(data: FormData) {
    log.info('Creating KP Group', { code: data.code });
    const res = await fetch('/api/admin/struktur/kp-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await res.json();
    toast.success('KP Group berhasil dibuat');
    router.push('/admin/struktur/kp-group');
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Network className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tambah KP Group</h1>
          <p className="text-sm text-gray-500">Buat grup KP baru untuk suatu kohort</p>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <FormWrapper<FormData>
          schema={createKPGroupSchema as Parameters<typeof FormWrapper<FormData>>[0]['schema']}
          defaultValues={{
            cohortId: '',
            code: '',
            name: '',
            kpCoordinatorUserId: '',
            capacityTarget: 12,
            capacityMax: 15,
          }}
          onSubmit={handleSubmit}
          submitLabel="Buat KP Group"
          onCancel={() => router.back()}
        >
          {({ control }) => (
            <>
              <FormInput
                control={control}
                name="cohortId"
                label="ID Kohort"
                placeholder="Contoh: clxyz..."
                description="ID kohort (dari halaman Kohort)"
              />
              <FormInput
                control={control}
                name="code"
                label="Kode Grup"
                placeholder="Contoh: KP-A"
                description="Kode unik dalam kohort, maks 20 karakter"
              />
              <FormInput
                control={control}
                name="name"
                label="Nama Grup"
                placeholder="Contoh: Kelompok Pendamping Alpha"
              />
              <FormInput
                control={control}
                name="kpCoordinatorUserId"
                label="ID Koordinator KP"
                placeholder="ID user koordinator KP"
              />
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  control={control}
                  name="capacityTarget"
                  label="Target Kapasitas"
                  type="number"
                  description="Jumlah ideal anggota (10-15)"
                />
                <FormInput
                  control={control}
                  name="capacityMax"
                  label="Kapasitas Maks"
                  type="number"
                  description="Batas maksimum anggota (12-18)"
                />
              </div>
            </>
          )}
        </FormWrapper>
      </div>
    </div>
  );
}

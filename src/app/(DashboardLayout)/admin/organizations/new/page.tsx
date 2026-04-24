'use client';

/**
 * /admin/organizations/new
 * SUPERADMIN — create a new organization.
 */

import { useRouter } from 'next/navigation';
import { FormWrapper, FormInput } from '@/components/shared/FormWrapper';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { Building2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from '@/lib/toast';

const schema = z.object({
  code: z.string().min(2).max(20, 'Maksimal 20 karakter'),
  name: z.string().min(2).max(100),
  fullName: z.string().min(5).max(300),
  contactEmail: z.string().email('Email tidak valid').optional().or(z.literal('')),
  websiteUrl: z.string().url('URL tidak valid').optional().or(z.literal('')),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Format warna harus #RRGGBB')
    .optional()
    .or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function NewOrganizationPage() {
  const router = useRouter();

  const handleSubmit = async (data: FormData) => {
    const res = await fetch('/api/admin/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        contactEmail: data.contactEmail || undefined,
        websiteUrl: data.websiteUrl || undefined,
        primaryColor: data.primaryColor || undefined,
      }),
    });
    if (!res.ok) throw await res.json();
    toast.success('Organisasi berhasil dibuat');
    router.push('/admin/organizations');
  };

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tambah Organisasi</h1>
          <p className="text-sm text-gray-500">Buat organisasi baru dalam sistem</p>
        </div>
      </div>

      <div className="max-w-3xl rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <FormWrapper<FormData>
          schema={schema}
          defaultValues={{
            code: '',
            name: '',
            fullName: '',
            contactEmail: '',
            websiteUrl: '',
            primaryColor: '',
          }}
          onSubmit={handleSubmit}
          submitLabel="Buat Organisasi"
          onCancel={() => router.push('/admin/organizations')}
        >
          {({ control }) => (
            <>
              <FormInput
                control={control}
                name="code"
                label="Kode Organisasi"
                placeholder="HMTC"
                description="2–20 karakter, huruf kapital. Contoh: HMTC, HMM"
              />
              <FormInput
                control={control}
                name="name"
                label="Nama Singkat"
                placeholder="HMTC ITS"
              />
              <FormInput
                control={control}
                name="fullName"
                label="Nama Lengkap"
                placeholder="Himpunan Mahasiswa Teknik Computer-Informatics"
              />
              <FormInput
                control={control}
                name="contactEmail"
                label="Email Kontak"
                type="email"
                placeholder="hmtc@its.ac.id"
                description="Opsional"
              />
              <FormInput
                control={control}
                name="websiteUrl"
                label="Website"
                placeholder="https://hmtc.its.ac.id"
                description="Opsional"
              />
              <FormInput
                control={control}
                name="primaryColor"
                label="Warna Primer"
                placeholder="#0077CC"
                description="Opsional. Format: #RRGGBB"
              />
            </>
          )}
        </FormWrapper>
      </div>
    </div>
  );
}

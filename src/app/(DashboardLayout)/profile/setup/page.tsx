'use client';

/**
 * /profile/setup
 * Profile setup wizard — update fullName, displayName, NRP.
 * Redirected here when profile is incomplete.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormWrapper, FormInput } from '@/components/shared/FormWrapper';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, UserCheck } from 'lucide-react';
import { z } from 'zod';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useSession } from 'next-auth/react';

const log = createLogger('profile-setup-page');

const schema = z.object({
  fullName: z.string().min(2, 'Nama minimal 2 karakter').max(200),
  displayName: z.string().max(100).optional().or(z.literal('')),
  nrp: z
    .string()
    .regex(/^\d{10}$/, 'NRP harus 10 digit angka')
    .optional()
    .or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function ProfileSetupPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [defaultValues, setDefaultValues] = useState<FormData>({
    fullName: '',
    displayName: '',
    nrp: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        log.info('Fetching current user profile');
        const res = await fetch('/api/users/me');
        if (!res.ok) return;
        const json = await res.json();
        const me = json.data;
        setDefaultValues({
          fullName: me.fullName ?? '',
          displayName: me.displayName ?? '',
          nrp: me.nrp ?? '',
        });
      } catch (err) {
        log.error('Failed to fetch profile', { err });
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, []);

  const handleSubmit = async (data: FormData) => {
    log.info('Updating profile');
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: data.fullName,
        displayName: data.displayName || undefined,
        nrp: data.nrp || undefined,
      }),
    });
    if (!res.ok) throw await res.json();
    toast.success('Profil berhasil disimpan');
    // Go to demographics next, then dashboard
    router.push('/profile/demographics');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Memuat profil...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <UserCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Lengkapi Profil</h1>
          <p className="text-sm text-gray-500">
            Halo, {session?.user?.name ?? 'pengguna baru'}! Lengkapi profil Anda sebelum melanjutkan.
          </p>
        </div>
      </div>

      <Alert className="border border-sky-300 bg-sky-50 dark:bg-sky-950 dark:border-sky-800">
        <Info className="h-4 w-4 text-sky-600" />
        <AlertDescription className="text-sky-800 dark:text-sky-200 text-sm">
          Informasi ini digunakan untuk keperluan administrasi NAWASENA. NRP diperlukan untuk
          verifikasi status kemahasiswaan Anda.
        </AlertDescription>
      </Alert>

      <div className="max-w-3xl">
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Informasi Dasar</CardTitle>
          </CardHeader>
          <CardContent>
            <FormWrapper<FormData>
              schema={schema}
              defaultValues={defaultValues}
              onSubmit={handleSubmit}
              submitLabel="Simpan & Lanjutkan"
              onCancel={() => router.push('/')}
            >
              {({ control }) => (
                <>
                  <FormInput
                    control={control}
                    name="fullName"
                    label="Nama Lengkap"
                    placeholder="Budi Santoso"
                    description="Nama sesuai dokumen resmi"
                  />
                  <FormInput
                    control={control}
                    name="displayName"
                    label="Nama Panggilan"
                    placeholder="Budi"
                    description="Opsional — nama yang ditampilkan di sistem"
                  />
                  <FormInput
                    control={control}
                    name="nrp"
                    label="NRP"
                    placeholder="5026211234"
                    description="10 digit Nomor Registrasi Pokok mahasiswa ITS. Opsional tapi direkomendasikan."
                  />
                </>
              )}
            </FormWrapper>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

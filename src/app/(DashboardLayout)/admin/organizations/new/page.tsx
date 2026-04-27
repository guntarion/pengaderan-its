'use client';

/**
 * /admin/organizations/new
 * SUPERADMIN only — wizard to onboard a new HMJ.
 *
 * Step 1: Identitas (code, name, fullName, slug)
 * Step 2: Afiliasi & Kontak (facultyCode, organizationType, kahimaName, kajurName, contactEmail)
 * Step 3: SC Lead Bootstrap (scLeadEmail — will create WhitelistEmail with role=SC)
 *
 * Email sending deferred to RV-D.
 *
 * Phase RV-C — M01 Revisi Multi-HMJ
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { Building2, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';

const log = createLogger('admin-org-new');

// ---- Zod schemas per step ----

const step1Schema = z.object({
  code: z
    .string()
    .min(2, 'Kode minimal 2 karakter')
    .max(20, 'Kode maksimal 20 karakter')
    .regex(/^[A-Z0-9-]+$/, 'Kode hanya huruf kapital, angka, dan tanda hubung'),
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  fullName: z
    .string()
    .min(5, 'Nama lengkap minimal 5 karakter')
    .max(300, 'Nama lengkap maksimal 300 karakter'),
  slug: z
    .string()
    .min(2, 'Slug minimal 2 karakter')
    .max(50, 'Slug maksimal 50 karakter')
    .regex(/^[a-z0-9-]+$/, 'Slug hanya huruf kecil, angka, dan tanda hubung'),
});

const step2Schema = z.object({
  facultyCode: z.string().min(1, 'Pilih fakultas'),
  organizationType: z.enum(['HMJ', 'ALUMNI_CHAPTER', 'INSTITUSI_PUSAT']),
  kahimaName: z.string().max(100).optional().or(z.literal('')),
  kajurName: z.string().max(100).optional().or(z.literal('')),
  contactEmail: z.string().email('Email tidak valid').optional().or(z.literal('')),
});

const step3Schema = z.object({
  scLeadEmail: z
    .string()
    .email('Email tidak valid')
    .min(1, 'Email SC Lead wajib diisi'),
});

// Combined for final submit
const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema);
type FullFormData = z.infer<typeof fullSchema>;

// ---- Faculty list (TODO(M02-RV-A): replace with /api/faculties fetch) ----
const FACULTY_OPTIONS = [
  { value: 'FSAD', label: 'FSAD — Fakultas Sains dan Analitika Data' },
  { value: 'FTIRS', label: 'FTIRS — Fakultas Teknologi Industri, Rekayasa, dan Sistem' },
  { value: 'FT-SPK', label: 'FT-SPK — Fakultas Teknik Sipil, Perencanaan dan Kebumian' },
  { value: 'FTK', label: 'FTK — Fakultas Teknologi Kelautan' },
  { value: 'FT-EIC', label: 'FT-EIC — Fakultas Teknologi Elektro dan Informatika Cerdas' },
  { value: 'FDKBD', label: 'FDKBD — Fakultas Desain Kreatif dan Bisnis Digital' },
  { value: 'FV', label: 'FV — Fakultas Vokasi' },
  { value: 'FKK', label: 'FKK — Fakultas Kedokteran dan Kesehatan' },
];

const ORG_TYPE_OPTIONS = [
  { value: 'HMJ', label: 'HMJ (Himpunan Mahasiswa Jurusan)' },
  { value: 'ALUMNI_CHAPTER', label: 'Alumni Chapter' },
  { value: 'INSTITUSI_PUSAT', label: 'Institusi Pusat' },
];

// ---- Step indicator ----
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
              i + 1 < current
                ? 'bg-emerald-500 text-white'
                : i + 1 === current
                ? 'bg-sky-500 text-white shadow-md'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {i + 1 < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`h-0.5 w-8 transition-all ${
                i + 1 < current ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

const STEP_LABELS = ['Identitas', 'Afiliasi & Kontak', 'SC Lead'];

// ---- Field components ----
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <Label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
  );
}

// ---- Main component ----
export default function NewOrganizationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const slugCustomized = useRef(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FullFormData>({
    resolver: zodResolver(fullSchema),
    mode: 'onChange',
    defaultValues: {
      code: '',
      name: '',
      fullName: '',
      slug: '',
      facultyCode: '',
      organizationType: 'HMJ',
      kahimaName: '',
      kajurName: '',
      contactEmail: '',
      scLeadEmail: '',
    },
  });

  const codeValue = watch('code');

  // Auto-derive slug from code when user hasn't customized it
  useEffect(() => {
    if (!slugCustomized.current && codeValue) {
      const derived = codeValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', derived, { shouldValidate: true });
    }
  }, [codeValue, setValue]);

  // Redirect non-SUPERADMIN
  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      toast.error('Hanya SUPERADMIN yang dapat mengakses halaman ini');
      router.replace('/admin/organizations');
    }
  }, [user, router]);

  const STEP_FIELDS: Record<number, (keyof FullFormData)[]> = {
    1: ['code', 'name', 'fullName', 'slug'],
    2: ['facultyCode', 'organizationType'],
    3: ['scLeadEmail'],
  };

  async function handleNext() {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  const onFinalSubmit = async (data: FullFormData) => {
    setSubmitting(true);
    setServerError(null);
    log.info('Creating organization', { code: data.code });
    try {
      const payload = {
        code: data.code.toUpperCase(),
        name: data.name,
        fullName: data.fullName,
        slug: data.slug,
        facultyCode: data.facultyCode || null,
        organizationType: data.organizationType,
        kahimaName: data.kahimaName || null,
        kajurName: data.kajurName || null,
        contactEmail: data.contactEmail || null,
        scLeadEmail: data.scLeadEmail,
      };
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json();
        const msg = errBody?.error?.message ?? 'Gagal membuat organisasi';
        setServerError(msg);
        toast.apiError(errBody);
        return;
      }
      const json = await res.json();
      toast.success(`Organisasi ${data.code} berhasil dibuat (status: PENDING)`);
      router.push(`/admin/organizations/${json.data.id}`);
    } catch (err) {
      log.error('Failed to create organization', { err });
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Onboard HMJ Baru</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Wizard pendaftaran organisasi baru (3 langkah)
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <StepIndicator current={step} total={3} />
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-sky-600 dark:text-sky-400">
            Langkah {step} dari 3:
          </span>{' '}
          {STEP_LABELS[step - 1]}
        </div>
      </div>

      {/* Server error banner */}
      {serverError && (
        <Alert className="border-2 border-red-400 bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-300">{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-2xl">
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-5">
          {/* ---- Step 1: Identitas ---- */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                Langkah 1: Identitas Organisasi
              </h2>

              {/* Code */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="code" required>Kode Organisasi</FieldLabel>
                <Controller
                  control={control}
                  name="code"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="code"
                      placeholder="HMM"
                      className="rounded-xl font-mono uppercase"
                      onChange={(e) => {
                        field.onChange(e.target.value.toUpperCase());
                      }}
                    />
                  )}
                />
                <p className="text-xs text-gray-500">
                  2–20 karakter, huruf kapital. Contoh: HMTC, HMM, HMS
                </p>
                <FieldError message={errors.code?.message} />
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="name" required>Nama Singkat</FieldLabel>
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="name"
                      placeholder="Himpunan Mahasiswa Mesin"
                      className="rounded-xl"
                    />
                  )}
                />
                <FieldError message={errors.name?.message} />
              </div>

              {/* Full name */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="fullName" required>Nama Lengkap</FieldLabel>
                <Controller
                  control={control}
                  name="fullName"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="fullName"
                      placeholder="Himpunan Mahasiswa Jurusan Teknik Mesin ITS"
                      className="rounded-xl"
                    />
                  )}
                />
                <FieldError message={errors.fullName?.message} />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="slug" required>Slug URL</FieldLabel>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 shrink-0">/org/</span>
                  <Controller
                    control={control}
                    name="slug"
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="slug"
                        placeholder="hmm"
                        className="rounded-xl font-mono"
                        onChange={(e) => {
                          slugCustomized.current = true;
                          field.onChange(e.target.value.toLowerCase());
                        }}
                      />
                    )}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Auto-generated dari kode. Hanya huruf kecil, angka, dan tanda hubung. Unik
                  case-insensitive.
                </p>
                <FieldError message={errors.slug?.message} />
              </div>
            </div>
          )}

          {/* ---- Step 2: Afiliasi & Kontak ---- */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                Langkah 2: Afiliasi & Kontak
              </h2>

              {/* Faculty */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="facultyCode" required>Kode Fakultas</FieldLabel>
                {/* TODO(M02-RV-A): replace with /api/faculties fetch */}
                <Controller
                  control={control}
                  name="facultyCode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="facultyCode" className="rounded-xl">
                        <SelectValue placeholder="Pilih Fakultas..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FACULTY_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.facultyCode?.message} />
              </div>

              {/* Organization type */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="organizationType" required>Tipe Organisasi</FieldLabel>
                <Controller
                  control={control}
                  name="organizationType"
                  render={({ field }) => (
                    <div className="flex flex-col gap-2">
                      {ORG_TYPE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            field.value === opt.value
                              ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-600'
                              : 'border-gray-200 dark:border-gray-700 hover:border-sky-200 dark:hover:border-sky-800'
                          }`}
                        >
                          <input
                            type="radio"
                            name="organizationType"
                            value={opt.value}
                            checked={field.value === opt.value}
                            onChange={() => field.onChange(opt.value)}
                            className="accent-sky-500"
                          />
                          <span className="text-sm font-medium">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                />
                <FieldError message={errors.organizationType?.message} />
              </div>

              {/* Kahima name */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="kahimaName">Nama Ketua Himpunan (Kahima)</FieldLabel>
                <Controller
                  control={control}
                  name="kahimaName"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="kahimaName"
                      placeholder="Opsional"
                      className="rounded-xl"
                    />
                  )}
                />
                <FieldError message={errors.kahimaName?.message} />
              </div>

              {/* Kajur name */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="kajurName">Nama Kepala Jurusan (Kajur)</FieldLabel>
                <Controller
                  control={control}
                  name="kajurName"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="kajurName"
                      placeholder="Opsional"
                      className="rounded-xl"
                    />
                  )}
                />
                <FieldError message={errors.kajurName?.message} />
              </div>

              {/* Contact email */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="contactEmail">Email Kontak Organisasi</FieldLabel>
                <Controller
                  control={control}
                  name="contactEmail"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="contactEmail"
                      type="email"
                      placeholder="hmm@its.ac.id (opsional)"
                      className="rounded-xl"
                    />
                  )}
                />
                <FieldError message={errors.contactEmail?.message} />
              </div>
            </div>
          )}

          {/* ---- Step 3: SC Lead Bootstrap ---- */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                Langkah 3: SC Lead Bootstrap
              </h2>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Email SC Lead akan didaftarkan ke Whitelist Email dengan role SC. Setelah
                  organisasi diaktifkan, SC Lead dapat login dengan email ini. Pengiriman
                  email undangan akan dilakukan secara manual (fase berikutnya).
                </span>
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="scLeadEmail" required>Email SC Lead</FieldLabel>
                <Controller
                  control={control}
                  name="scLeadEmail"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="scLeadEmail"
                      type="email"
                      placeholder="sc-lead@its.ac.id"
                      className="rounded-xl"
                    />
                  )}
                />
                <p className="text-xs text-gray-500">
                  Email ini akan dipakai sebagai akun pertama SC di organisasi baru.
                </p>
                <FieldError message={errors.scLeadEmail?.message} />
              </div>

              {/* Summary */}
              <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Ringkasan
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-500">Kode:</span>
                  <span className="font-mono font-semibold">{watch('code')}</span>
                  <span className="text-gray-500">Nama:</span>
                  <span>{watch('name')}</span>
                  <span className="text-gray-500">Slug:</span>
                  <span className="font-mono">{watch('slug')}</span>
                  <span className="text-gray-500">Fakultas:</span>
                  <span>{watch('facultyCode') || '—'}</span>
                  <span className="text-gray-500">Tipe:</span>
                  <span>{watch('organizationType')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={step === 1 ? () => router.push('/admin/organizations') : handleBack}
              disabled={submitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step === 1 ? 'Batal' : 'Kembali'}
            </Button>

            {step < 3 ? (
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
              >
                Lanjut
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit(onFinalSubmit)}
                className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {submitting ? 'Menyimpan...' : 'Buat Organisasi'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

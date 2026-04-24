'use client';

/**
 * /admin/notifications/rules/new — Create new org-specific notification rule
 * Roles: SC, SUPERADMIN
 */

import { useRouter } from 'next/navigation';
import { FormWrapper, FormInput, FormTextarea } from '@/components/shared/FormWrapper';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const log = createLogger('admin-notifications-rules-new');

const ruleSchema = z.object({
  name: z.string().min(1, 'Nama aturan diperlukan').max(200),
  description: z.string().max(1000).optional(),
  templateKey: z.string().min(1, 'Template key diperlukan'),
  cronExpression: z.string().min(1, 'Cron expression diperlukan'),
  audienceResolverKey: z.string().min(1, 'Audience resolver key diperlukan'),
});

type RuleFormData = z.infer<typeof ruleSchema>;

const CRON_EXAMPLES = [
  { label: 'Setiap hari jam 19:00 WIB', value: '0 12 * * *' },
  { label: 'Setiap Sabtu jam 17:00 WIB', value: '0 10 * * 6' },
  { label: 'Setiap Senin-Jumat jam 17:00 WIB', value: '0 10 * * 1-5' },
  { label: 'Setiap Senin jam 09:00 WIB', value: '0 2 * * 1' },
];

const RESOLVER_OPTIONS = [
  'maba-pulse-daily',
  'maba-journal-weekly',
  'kp-standup-daily',
  'kp-debrief-weekly',
  'kasuh-logbook-biweekly',
  'oc-setup-h7',
  'sc-triwulan-h7',
  'kp-escalation-maba-silent',
];

export default function NewRulePage() {
  const router = useRouter();

  async function handleSubmit(data: RuleFormData) {
    log.info('Creating notification rule', { name: data.name });

    const res = await fetch('/api/notifications/admin/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        category: 'FORM_REMINDER',
        channels: ['PUSH', 'EMAIL'],
        maxRemindersPerWeek: 3,
        active: true,
      }),
    });

    if (!res.ok) throw await res.json();

    const json = await res.json();
    toast.success('Aturan notifikasi berhasil dibuat');
    router.push(`/admin/notifications/rules/${json.data.id}`);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <DynamicBreadcrumb />

      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 text-gray-500 hover:text-gray-700"
          onClick={() => router.push('/admin/notifications/rules')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Kembali
        </Button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Aturan Baru</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Buat aturan notifikasi baru spesifik untuk organisasi Anda
        </p>
      </div>

      {/* CRON examples */}
      <div className="bg-sky-50 dark:bg-sky-950 border border-sky-100 dark:border-sky-900 rounded-xl p-4">
        <Label className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wide">
          Contoh CRON Expression (UTC)
        </Label>
        <div className="mt-2 space-y-1">
          {CRON_EXAMPLES.map((ex) => (
            <div key={ex.value} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">{ex.label}</span>
              <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 font-mono">
                {ex.value}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Resolver options hint */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-xl p-4">
        <Label className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
          Audience Resolver Keys tersedia
        </Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {RESOLVER_OPTIONS.map((r) => (
            <code key={r} className="text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 font-mono">
              {r}
            </code>
          ))}
        </div>
      </div>

      <FormWrapper<RuleFormData>
        schema={ruleSchema}
        defaultValues={{ name: '', description: '', templateKey: '', cronExpression: '', audienceResolverKey: '' }}
        onSubmit={handleSubmit}
        submitLabel="Buat Aturan"
        onCancel={() => router.push('/admin/notifications/rules')}
      >
        {({ control }) => (
          <>
            <FormInput
              control={control}
              name="name"
              label="Nama Aturan"
              placeholder="Contoh: Reminder Pulse Maba Sore"
            />
            <FormTextarea
              control={control}
              name="description"
              label="Deskripsi"
              placeholder="Deskripsi singkat aturan ini (opsional)"
            />
            <FormInput
              control={control}
              name="templateKey"
              label="Template Key"
              placeholder="Contoh: MABA_PULSE_DAILY"
              description="Harus sesuai dengan templateKey yang ada di database"
            />
            <FormInput
              control={control}
              name="cronExpression"
              label="CRON Expression (UTC)"
              placeholder="Contoh: 0 12 * * *"
              description="Jadwal pengiriman dalam UTC. Lihat contoh di atas."
            />
            <FormInput
              control={control}
              name="audienceResolverKey"
              label="Audience Resolver Key"
              placeholder="Contoh: maba-pulse-daily"
              description="Menentukan siapa yang akan menerima notifikasi ini"
            />
          </>
        )}
      </FormWrapper>
    </div>
  );
}

'use client';

/**
 * src/app/(DashboardLayout)/dashboard/life-map/new/page.tsx
 * NAWASENA M07 — Create new Life Map goal page.
 */

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { LifeMapGoalForm, type GoalFormSubmitValues } from '@/components/life-map/LifeMapGoalForm';
import { toast } from '@/lib/toast';
import { LifeArea } from '@prisma/client';

export default function NewLifeMapGoalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const areaParam = searchParams.get('area') as LifeArea | null;

  const handleSubmit = useCallback(
    async (values: GoalFormSubmitValues) => {
      const res = await fetch('/api/life-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area: values.area,
          goalText: values.goalText,
          metric: values.metric,
          whyMatters: values.whyMatters,
          deadline: new Date(values.deadline).toISOString(),
          achievabilityNote: values.achievabilityNote || undefined,
          sharedWithKasuh: values.sharedWithKasuh,
        }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success('Goal berhasil disimpan!');
        router.push(`/dashboard/life-map/${json.data.id}`);
      } else {
        throw json; // FormWrapper will catch and display error
      }
    },
    [router],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            labels={{
              'life-map': 'Life Map',
              'new': 'Goal Baru',
            }}
            className="text-white/70 mb-2 text-sm"
          />
          <h1 className="text-xl font-bold">Tambah Goal Baru</h1>
          <p className="text-sm text-white/80 mt-0.5">
            Tetapkan tujuan SMART untuk perjalananmu
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <LifeMapGoalForm
            defaultArea={areaParam ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            submitLabel="Simpan Goal"
          />
        </div>
      </div>
    </div>
  );
}

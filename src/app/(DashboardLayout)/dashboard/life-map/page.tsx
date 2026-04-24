'use client';

/**
 * src/app/(DashboardLayout)/dashboard/life-map/page.tsx
 * NAWASENA M07 — Life Map overview page (6 area tiles) for Maba.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { LifeMapOverviewCard, type LifeArea } from '@/components/life-map/LifeMapOverviewCard';
import { LifeMapGoalCard } from '@/components/life-map/LifeMapGoalCard';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { SkeletonCardGrid, SkeletonPageHeader } from '@/components/shared/skeletons';
import { PlusIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type MilestoneKey = 'M1' | 'M2' | 'M3';
type LifeMapStatus = 'ACTIVE' | 'ACHIEVED' | 'ADJUSTED';

interface AreaOverview {
  area: LifeArea;
  activeCount: number;
  achievedCount: number;
  adjustedCount: number;
  latestGoal: { id: string; goalText: string } | null;
  milestonesDone: MilestoneKey[];
}

interface GoalSummary {
  id: string;
  area: string;
  goalText: string;
  metric: string;
  deadline: string;
  status: LifeMapStatus;
  sharedWithKasuh: boolean;
  updates: Array<{ id: string; milestone: MilestoneKey; progressPercent: number; isLate: boolean }>;
}

export default function LifeMapPage() {
  const searchParams = useSearchParams();
  const areaFilter = searchParams.get('area') as LifeArea | null;

  const [overview, setOverview] = useState<AreaOverview[]>([]);
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  // Fetch overview (all areas summary)
  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/life-map?overview=true');
      const json = await res.json();
      if (json.success) {
        setOverview(json.data as AreaOverview[]);
      }
    } catch {
      toast.error('Gagal memuat overview Life Map');
    }
  }, []);

  // Fetch filtered goals when area is selected
  const fetchGoals = useCallback(async () => {
    if (!areaFilter) {
      setGoals([]);
      return;
    }
    try {
      const params = new URLSearchParams({ area: areaFilter, status: statusFilter, limit: '20' });
      const res = await fetch(`/api/life-map?${params}`);
      const json = await res.json();
      if (json.success) {
        setGoals(json.data as GoalSummary[]);
      }
    } catch {
      toast.error('Gagal memuat goals');
    }
  }, [areaFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOverview(), fetchGoals()]).finally(() => setLoading(false));
  }, [fetchOverview, fetchGoals]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            labels={{ 'life-map': 'Life Map' }}
            className="text-white/70 mb-2 text-sm"
          />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Life Map</h1>
              <p className="text-sm text-white/80 mt-0.5">
                Petakan tujuan hidupmu di 6 area kehidupan
              </p>
            </div>
            <Link href="/dashboard/life-map/new">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1.5 rounded-xl">
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Tambah Goal</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        {loading ? (
          <>
            <SkeletonPageHeader />
            <SkeletonCardGrid count={6} />
          </>
        ) : (
          <>
            {/* Overview tiles — always shown */}
            <div>
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                Overview per Area
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {overview.map((area) => (
                  <LifeMapOverviewCard key={area.area} overview={area} />
                ))}
              </div>
            </div>

            {/* Filtered goal list (when area selected) */}
            {areaFilter && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Goals — {areaFilter.replace(/_/g, ' ')}
                  </h2>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 rounded-xl border-sky-200 dark:border-sky-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Aktif</SelectItem>
                      <SelectItem value="ACHIEVED">Tercapai</SelectItem>
                      <SelectItem value="ADJUSTED">Direvisi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {goals.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-10 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Belum ada goal {statusFilter.toLowerCase()} di area ini
                    </p>
                    <Link href={`/dashboard/life-map/new?area=${areaFilter}`} className="inline-block mt-3">
                      <Button className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm">
                        <PlusIcon className="h-4 w-4 mr-1" /> Tambah Goal
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {goals.map((goal) => (
                      <LifeMapGoalCard
                        key={goal.id}
                        goal={goal}
                        href={`/dashboard/life-map/${goal.id}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

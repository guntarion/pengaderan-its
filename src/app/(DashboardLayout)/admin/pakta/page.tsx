'use client';

/**
 * /admin/pakta
 * Admin — list pakta versions with dual-scope tabs.
 *
 * Tab structure:
 *   Tab 1 "Pakta MABA (DIGITAL)"     — SOCIAL_CONTRACT_MABA, organizationId IS NULL (global)
 *   Tab 2 "Pakta Panitia (ETIK)"     — PAKTA_PANITIA, per-org
 *   Tab 3 "Pakta Pengader 2027"       — PAKTA_PENGADER_2027, per-org
 *
 * Role-based behavior:
 *   SUPERADMIN: can manage all; sees org filter dropdown for ETIK tabs
 *   SC: DIGITAL tab is read-only; ETIK tabs show own org only
 *   PEMBINA/BLM: all tabs read-only (no action buttons)
 *
 * Phase RV-D — M01 Revisi Multi-HMJ
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Users, RefreshCw, Lock, Building2 } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/hooks/useConfirm';
import { createLogger } from '@/lib/logger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const log = createLogger('admin-pakta-page');

type PaktaVersionStatus = 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
type TabScope = 'DIGITAL' | 'ETIK_PANITIA' | 'ETIK_PENGADER';

interface OrgSummary {
  id: string;
  code: string;
  name: string;
}

interface PaktaVersion {
  id: string;
  type: string;
  versionNumber: number;
  title: string;
  status: PaktaVersionStatus;
  passingScore: number;
  publishedAt: string | null;
  effectiveFrom: string;
  organizationId: string | null;
  organization: OrgSummary | null;
  _count: { signatures: number };
}

const STATUS_BADGE: Record<PaktaVersionStatus, { label: string; class: string }> = {
  DRAFT: { label: 'Draft', class: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
  PUBLISHED: { label: 'Aktif', class: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  SUPERSEDED: { label: 'Diganti', class: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
};

const TABS: { scope: TabScope; label: string; sublabel: string; type: string }[] = [
  {
    scope: 'DIGITAL',
    label: 'Pakta MABA',
    sublabel: 'DIGITAL · Institusi-wide',
    type: 'SOCIAL_CONTRACT_MABA',
  },
  {
    scope: 'ETIK_PANITIA',
    label: 'Pakta Panitia',
    sublabel: 'ETIK · Per-HMJ',
    type: 'PAKTA_PANITIA',
  },
  {
    scope: 'ETIK_PENGADER',
    label: 'Pakta Pengader 2027',
    sublabel: 'ETIK · Per-HMJ',
    type: 'PAKTA_PENGADER_2027',
  },
];

export default function AdminPaktaPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { confirm, ConfirmDialog } = useConfirm();

  const userRole = session?.user?.role ?? '';
  const isSuperadmin = userRole === 'SUPERADMIN';
  const isReadOnly = userRole === 'PEMBINA' || userRole === 'BLM';

  const [activeTab, setActiveTab] = useState<TabScope>('DIGITAL');
  const [versions, setVersions] = useState<PaktaVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);

  // Fetch organizations list for SUPERADMIN filter dropdown
  useEffect(() => {
    if (!isSuperadmin) return;
    async function fetchOrgs() {
      try {
        const res = await fetch('/api/admin/organizations');
        if (!res.ok) return;
        const json = await res.json();
        setOrgs((json.data ?? []).map((o: { id: string; code: string; name: string }) => ({
          id: o.id,
          code: o.code,
          name: o.name,
        })));
      } catch {
        log.warn('Failed to fetch organizations for filter');
      }
    }
    fetchOrgs();
  }, [isSuperadmin]);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ scope: activeTab });
      if (isSuperadmin && orgFilter !== 'all') {
        params.set('orgId', orgFilter);
      }
      const res = await fetch(`/api/admin/pakta/versions?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json();
        toast.apiError(json);
        return;
      }
      const json = await res.json();
      setVersions(json.data ?? []);
    } catch (err) {
      toast.error('Gagal memuat daftar versi pakta');
      log.error('Fetch error', { error: err });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, isSuperadmin, orgFilter]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleTriggerResign = async (versionId: string, versionNumber: number, signedCount: number) => {
    const confirmed = await confirm({
      title: `Trigger Re-Sign Versi ${versionNumber}?`,
      description: `Akan meminta ${signedCount} penanda tangan untuk menandatangani ulang. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Trigger Re-Sign',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/pakta/versions/${versionId}/resign`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.apiError(json);
        return;
      }
      toast.success(`Re-sign dipicu untuk ${json.data.affectedCount} pengguna`);
    } catch (err) {
      toast.error('Gagal trigger re-sign');
      log.error('Re-sign trigger error', { error: err });
    }
  };

  const currentTab = TABS.find((t) => t.scope === activeTab)!;

  // SC cannot create DIGITAL versions
  const canCreate =
    !isReadOnly &&
    !(userRole === 'SC' && activeTab === 'DIGITAL');

  const isDigitalTab = activeTab === 'DIGITAL';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2.5">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Manajemen Pakta</h1>
                <p className="text-sm text-sky-100 mt-0.5">
                  Kelola versi pakta DIGITAL (institusi) &amp; ETIK (per-HMJ)
                </p>
              </div>
            </div>
            {canCreate && (
              <Button
                onClick={() => router.push('/admin/pakta/new')}
                className="bg-transparent hover:bg-white/20 text-white border border-white/40 gap-2"
              >
                <Plus className="h-4 w-4" />
                Versi Baru
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-sky-100 dark:border-sky-900 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.scope}
                onClick={() => setActiveTab(tab.scope)}
                className={[
                  'flex-shrink-0 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.scope
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                <span>{tab.label}</span>
                <span className={[
                  'ml-1.5 text-xs',
                  activeTab === tab.scope ? 'text-sky-500 dark:text-sky-400' : 'text-gray-400',
                ].join(' ')}>
                  ({tab.sublabel})
                </span>
              </button>
            ))}
          </div>

          {/* Tab controls bar */}
          <div className="px-5 py-3 flex items-center gap-3 border-b border-sky-50 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/10 flex-wrap">
            {/* Info for SC on DIGITAL tab */}
            {userRole === 'SC' && isDigitalTab && (
              <div className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400">
                <Lock className="h-3.5 w-3.5" />
                <span>Pakta DIGITAL dikelola oleh SUPERADMIN. SC hanya dapat melihat.</span>
              </div>
            )}

            {/* Org filter for SUPERADMIN on ETIK tabs */}
            {isSuperadmin && !isDigitalTab && (
              <div className="flex items-center gap-2 ml-auto">
                <Building2 className="h-4 w-4 text-gray-400" />
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectTrigger className="h-8 text-xs w-[200px] rounded-lg">
                    <SelectValue placeholder="Semua HMJ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua HMJ</SelectItem>
                    {orgs.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.code} — {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Spacer for non-filtered states */}
            {!(userRole === 'SC' && isDigitalTab) && !(isSuperadmin && !isDigitalTab) && (
              <div className="h-4" />
            )}
          </div>

          {/* Tab content */}
          {isLoading ? (
            <div className="p-5">
              <SkeletonTable rows={5} columns={5} />
            </div>
          ) : versions.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Belum ada versi pakta {currentTab.label}
              </p>
              {canCreate && (
                <Button
                  onClick={() => router.push('/admin/pakta/new')}
                  className="mt-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                >
                  Terbitkan {currentTab.label} Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {versions.map((v) => {
                const statusBadge = STATUS_BADGE[v.status];
                const orgLabel = v.organizationId === null
                  ? 'Institusi'
                  : v.organization
                    ? `${v.organization.code}`
                    : 'Per-HMJ';

                const canTriggerResign =
                  !isReadOnly &&
                  v.status === 'PUBLISHED' &&
                  !(userRole === 'SC' && isDigitalTab);

                return (
                  <div
                    key={v.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-sky-50/60 dark:hover:bg-sky-950/10 transition-colors"
                  >
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          v{v.versionNumber} — {v.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs flex-shrink-0 ${statusBadge.class}`}
                        >
                          {statusBadge.label}
                        </Badge>
                        {/* Scope badge */}
                        <Badge
                          variant="outline"
                          className={
                            v.organizationId === null
                              ? 'text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                              : 'text-xs bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800'
                          }
                        >
                          {orgLabel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {v._count.signatures} penanda tangan
                        </span>
                        <span>Passing score: {v.passingScore}%</span>
                        {v.publishedAt && (
                          <span>
                            Diterbitkan: {new Date(v.publishedAt).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/pakta/${v.id}/signers`)}
                        className="text-xs h-8 gap-1.5"
                      >
                        <Users className="h-3 w-3" />
                        Signers
                      </Button>

                      {canTriggerResign && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTriggerResign(v.id, v.versionNumber, v._count.signatures)}
                          className="text-xs h-8 gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/20"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Re-Sign
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog />
    </div>
  );
}

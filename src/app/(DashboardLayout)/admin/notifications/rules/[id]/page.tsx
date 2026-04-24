'use client';

/**
 * /admin/notifications/rules/[id] — Rule detail + recent executions
 * Roles: SC, SUPERADMIN
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Play, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';

const log = createLogger('admin-notifications-rule-detail');

interface RuleDetail {
  id: string;
  name: string;
  description: string | null;
  templateKey: string;
  cronExpression: string;
  timezone: string;
  category: string;
  channels: string[];
  audienceResolverKey: string;
  active: boolean;
  isGlobal: boolean;
  lastExecutedAt: string | null;
  createdAt: string;
  createdBy: { fullName: string } | null;
  executions: Array<{
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    usersTargeted: number;
    usersSent: number;
    usersFailed: number;
    triggeredBy: string;
  }>;
  _count: { executions: number };
}

interface AudiencePreview {
  count: number;
  users: Array<{ id: string; fullName: string; email?: string }>;
}

const execStatusColor = (s: string) => {
  switch (s) {
    case 'SUCCESS': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'PARTIAL': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'FAILED': return 'bg-red-100 text-red-800 border-red-300';
    case 'RUNNING': return 'bg-sky-100 text-sky-800 border-sky-300';
    default: return 'bg-gray-100 text-gray-600 border-gray-300';
  }
};

export default function RuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [rule, setRule] = useState<RuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const canManage = user?.role === 'SC' || user?.role === 'SUPERADMIN';

  useEffect(() => {
    async function fetchRule() {
      try {
        const res = await fetch(`/api/notifications/admin/rules/${id}`);
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setRule(json.data);
      } catch (err) {
        log.error('Failed to fetch rule', { err, id });
        toast.error('Gagal memuat detail aturan');
      } finally {
        setLoading(false);
      }
    }
    fetchRule();
  }, [id]);

  async function handlePreviewAudience() {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/notifications/admin/rules/${id}/preview-audience`, {
        method: 'POST',
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setAudiencePreview(json.data);
    } catch (err) {
      log.error('Failed to preview audience', { err });
      toast.error('Gagal memuat pratinjau audiens');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    try {
      const res = await fetch(`/api/notifications/admin/rules/${id}/run-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual trigger dari admin panel' }),
      });

      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }

      const data = await res.json();
      toast.success(
        `Eksekusi selesai: ${data.data.usersSent}/${data.data.usersTargeted} berhasil`,
      );

      // Refresh rule
      const ruleRes = await fetch(`/api/notifications/admin/rules/${id}`);
      if (ruleRes.ok) {
        const ruleJson = await ruleRes.json();
        setRule(ruleJson.data);
      }
    } catch (err) {
      log.error('Failed to run rule now', { err });
      toast.error('Gagal menjalankan aturan');
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <SkeletonTable rows={4} />;
  if (!rule) return <div className="text-gray-500">Aturan tidak ditemukan.</div>;

  return (
    <div className="space-y-6">
      <DynamicBreadcrumb />

      {/* Back + header */}
      <div className="flex items-start justify-between">
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{rule.name}</h1>
          {rule.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rule.description}</p>
          )}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={previewLoading}
              onClick={handlePreviewAudience}
            >
              <Users className="h-4 w-4 mr-1" />
              {previewLoading ? 'Memuat...' : 'Pratinjau Audiens'}
            </Button>
            <Button
              size="sm"
              className="bg-sky-500 hover:bg-sky-600 text-white"
              disabled={running}
              onClick={handleRunNow}
            >
              <Play className="h-4 w-4 mr-1" />
              {running ? 'Berjalan...' : 'Jalankan Sekarang'}
            </Button>
          </div>
        )}
      </div>

      {/* Audience preview */}
      {audiencePreview && (
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Pratinjau Audiens — {audiencePreview.count} pengguna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {audiencePreview.users.slice(0, 12).map((u) => (
                <div key={u.id} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {u.fullName}
                </div>
              ))}
              {audiencePreview.count > 12 && (
                <div className="text-xs text-gray-400 italic">
                  + {audiencePreview.count - 12} lainnya
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rule details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Detail Aturan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Template Key</span>
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{rule.templateKey}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jadwal (CRON)</span>
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{rule.cronExpression}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Timezone</span>
              <span className="text-gray-700 dark:text-gray-300">{rule.timezone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Kategori</span>
              <Badge className="text-xs">{rule.category}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Channel</span>
              <div className="flex gap-1">
                {rule.channels.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Resolver</span>
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{rule.audienceResolverKey}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <Badge className={rule.active
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs'
                : 'bg-gray-100 text-gray-600 border-gray-300 border text-xs'
              }>
                {rule.active ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Terakhir jalan</span>
              <span className="text-gray-700 dark:text-gray-300 text-xs">
                {rule.lastExecutedAt
                  ? new Date(rule.lastExecutedAt).toLocaleString('id-ID')
                  : 'Belum pernah'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent executions */}
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Eksekusi Terbaru ({rule._count.executions} total)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rule.executions.length === 0 ? (
              <p className="text-xs text-gray-400">Belum ada eksekusi</p>
            ) : (
              rule.executions.map((exec) => (
                <div key={exec.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    {exec.status === 'SUCCESS' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {exec.status === 'FAILED' && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                    {exec.status === 'RUNNING' && <Clock className="h-3.5 w-3.5 text-sky-500 animate-spin" />}
                    {exec.status === 'PARTIAL' && <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />}
                    <div>
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        {new Date(exec.startedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                      <div className="text-xs text-gray-400">
                        {exec.usersSent}/{exec.usersTargeted} terkirim
                        {exec.triggeredBy.startsWith('MANUAL') && ' · Manual'}
                      </div>
                    </div>
                  </div>
                  <Badge className={`text-xs border ${execStatusColor(exec.status)}`}>
                    {exec.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

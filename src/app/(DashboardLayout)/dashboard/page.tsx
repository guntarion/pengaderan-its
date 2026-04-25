'use client';

/**
 * src/app/(DashboardLayout)/dashboard/page.tsx
 * M13 — Dashboard entry. Reads session role and redirects to the
 * role-specific dashboard URL. Falls back to a role-selection UI if
 * the role doesn't map to a known dashboard (e.g. SUPERADMIN, legacy roles).
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDefaultDashboardUrl } from '@/lib/dashboard/drilldown';
import { createLogger } from '@/lib/logger';
import { SkeletonCard } from '@/components/shared/skeletons';
import Link from 'next/link';
import {
  LayoutDashboard,
  ChevronRight,
  BookOpen,
  Heart,
  ShieldAlert,
  ClipboardList,
  Flame,
  FileText,
  Users,
  Map,
  BarChart2,
  Eye,
  Layers,
  Bell,
  User,
} from 'lucide-react';

const log = createLogger('m13/dashboard/entry');

// Roles with their own dashboard pages in NAWASENA
const NAWASENA_ROLES = ['MABA', 'KP', 'KASUH', 'OC', 'SC', 'BLM', 'PEMBINA', 'SATGAS'] as const;

// Common destinations always visible regardless of role
const SHARED_LINKS = [
  { href: '/kegiatan', icon: BookOpen, label: 'Katalog Kegiatan', desc: 'Lihat semua kegiatan angkatan' },
  { href: '/dashboard/mental-health', icon: Heart, label: 'Kesehatan Mental', desc: 'Skrining & sumber daya' },
  { href: '/anon-report', icon: ShieldAlert, label: 'Lapor Anonim', desc: 'Kirim laporan tanpa identitas' },
  { href: '/anon-status', icon: ClipboardList, label: 'Cek Status Laporan', desc: 'Lacak laporan dengan kode unik' },
];

// Role-specific quick-access links shown in the fallback panel
const ROLE_QUICK_LINKS: Record<string, { href: string; icon: React.ComponentType<{ className?: string }>; label: string; desc: string }[]> = {
  MABA: [
    { href: '/dashboard/maba', icon: Flame, label: 'Dashboard Saya', desc: 'Streak, passport, mood hari ini' },
    { href: '/dashboard/passport', icon: BookOpen, label: 'Passport Digital', desc: 'Progress kegiatan wajib' },
    { href: '/dashboard/pulse', icon: Flame, label: 'Pulse Check', desc: 'Isi suasana hati hari ini' },
    { href: '/dashboard/journal', icon: FileText, label: 'Jurnal Harian', desc: 'Tulis refleksi mingguan' },
    { href: '/dashboard/life-map', icon: Map, label: 'Life Map', desc: 'Peta kehidupan & time capsule' },
    { href: '/dashboard/kakak-c', icon: User, label: 'Kakak Konselor', desc: 'Konsultasi rahasia dengan kakak pembimbing' },
  ],
  KP: [
    { href: '/dashboard/kp', icon: Users, label: 'Dashboard KP', desc: 'Grup, red flag, debrief' },
    { href: '/dashboard/kp/group', icon: Users, label: 'Grup Saya', desc: 'Daftar anggota grup' },
    { href: '/dashboard/kp/mood', icon: BarChart2, label: 'Mood Kelompok', desc: 'Pantau mood harian real-time' },
    { href: '/dashboard/kp/journal-review', icon: FileText, label: 'Nilai Jurnal', desc: 'Antrian jurnal menunggu penilaian' },
    { href: '/dashboard/kp/log/daily', icon: ClipboardList, label: 'Log Harian', desc: 'Stand-up log hari ini' },
    { href: '/dashboard/kp/log/weekly', icon: BookOpen, label: 'Debrief Mingguan', desc: 'Ringkasan mingguan KP' },
  ],
  KASUH: [
    { href: '/dashboard/kasuh', icon: Heart, label: 'Dashboard KASUH', desc: 'Adik asuh, logbook, pulse trend' },
    { href: '/dashboard/kasuh', icon: ClipboardList, label: 'Logbook Adik Asuh', desc: 'Status siklus dan log terbaru' },
  ],
  OC: [
    { href: '/dashboard/oc', icon: LayoutDashboard, label: 'Dashboard OC', desc: 'Kegiatan PIC & evaluasi pending' },
    { href: '/dashboard/kegiatan', icon: BookOpen, label: 'Manajemen Kegiatan', desc: 'Buat & kelola kegiatan' },
  ],
  SC: [
    { href: '/dashboard/sc', icon: Layers, label: 'Dashboard SC', desc: 'Snapshot angkatan & mood live' },
    { href: '/dashboard/sc/triwulan', icon: ClipboardList, label: 'Review Triwulan', desc: 'Buat & submit laporan triwulan' },
    { href: '/dashboard/konsekuensi', icon: ShieldAlert, label: 'Konsekuensi', desc: 'Manajemen konsekuensi peserta' },
  ],
  BLM: [
    { href: '/dashboard/blm', icon: Eye, label: 'Dashboard BLM', desc: 'Triage laporan anonim & kepatuhan' },
    { href: '/dashboard/blm/anon-reports', icon: ShieldAlert, label: 'Laporan Anonim', desc: 'Antrian laporan masuk' },
    { href: '/dashboard/blm/triwulan', icon: ClipboardList, label: 'Audit Triwulan', desc: 'Laporan menunggu audit BLM' },
  ],
  PEMBINA: [
    { href: '/dashboard/sc/triwulan', icon: ClipboardList, label: 'Tanda Tangan Triwulan', desc: 'Review dari SC menunggu tanda tangan' },
  ],
  SATGAS: [
    { href: '/dashboard/konsekuensi', icon: ShieldAlert, label: 'Konsekuensi', desc: 'Kelola pelanggaran dan sanksi' },
  ],
};

// Role display names and descriptions
const ROLE_INFO: Record<string, { title: string; subtitle: string }> = {
  MABA: { title: 'Mahasiswa Baru', subtitle: 'Kelola perjalanan pengaderanmu' },
  KP: { title: 'Kakak Pembimbing', subtitle: 'Dashboard pendampingan & laporan' },
  KASUH: { title: 'Kakak Asuh', subtitle: 'Pantau dan dampingi adik asuhmu' },
  OC: { title: 'Organizing Committee', subtitle: 'Kelola kegiatan dan evaluasi NPS' },
  SC: { title: 'Steering Committee', subtitle: 'Kendali program angkatan' },
  BLM: { title: 'Badan Legislatif Mahasiswa', subtitle: 'Pengawasan & audit triwulan' },
  PEMBINA: { title: 'Pembina', subtitle: 'Tanda tangan & pengawasan program' },
  SATGAS: { title: 'Satuan Tugas', subtitle: 'Penegakan kepatuhan & konsekuensi' },
  SUPERADMIN: { title: 'Super Admin', subtitle: 'Akses penuh ke seluruh sistem' },
  admin: { title: 'Administrator', subtitle: 'Manajemen sistem' },
};

// Fallback links for roles without a dedicated dashboard (admin, SUPERADMIN, etc.)
const FALLBACK_LINKS = [
  { href: '/dashboard/superadmin', label: 'Super Admin Panel', roles: ['SUPERADMIN', 'admin'] },
  { href: '/dashboard', label: 'Beranda', roles: [] },
];

export default function DashboardEntryPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;

    const role = user.role;
    log.info('Resolving dashboard redirect', { role });

    // If the role maps to a known NAWASENA dashboard, redirect there
    const isNawasenaRole = (NAWASENA_ROLES as readonly string[]).includes(role);
    if (isNawasenaRole) {
      const url = getDefaultDashboardUrl(role);
      if (url !== '/dashboard') {
        log.info('Redirecting to role dashboard', { role, url });
        router.replace(url);
        return;
      }
    }

    // SUPERADMIN: redirect to superadmin panel
    if (role === 'SUPERADMIN' || role === 'admin') {
      router.replace('/dashboard/superadmin');
    }
  }, [user, isLoading, router]);

  // Show loading skeleton while resolving
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <h1 className="text-xl font-bold">Dashboard NAWASENA</h1>
            <p className="text-sm text-white/80 mt-1">Memuat informasi sesi...</p>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const role = user.role;
  const isNawasenaRole = (NAWASENA_ROLES as readonly string[]).includes(role);

  if (isNawasenaRole) {
    // Still loading redirect — show skeleton with role-aware message
    const info = ROLE_INFO[role];
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="flex items-center gap-3 mt-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {info ? info.title : `Dashboard ${role}`}
                </h1>
                <p className="text-sm text-white/80">
                  Mengalihkan ke dashboard Anda...
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
          {/* While redirecting, show role-specific quick links so the user
              isn't staring at blank skeletons if redirect is slow */}
          {ROLE_QUICK_LINKS[role] && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Pintasan Cepat
                </h2>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-slate-700">
                {ROLE_QUICK_LINKS[role].slice(0, 4).map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors active:bg-sky-100 dark:active:bg-slate-600"
                    >
                      <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 shrink-0">
                        <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{link.label}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate block">{link.desc}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // Fallback UI for unmapped roles (SAC, ELDER, DOSEN_WALI, ALUMNI, SUPERADMIN pending redirect)
  const info = ROLE_INFO[role];
  const roleLinks = ROLE_QUICK_LINKS[role] ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {info ? `Dashboard ${info.title}` : 'Dashboard NAWASENA'}
              </h1>
              <p className="text-sm text-white/80">
                Selamat datang, {user.name ?? user.email}
                {info?.subtitle ? ` — ${info.subtitle}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Role-specific quick links (if available) */}
        {roleLinks.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Fitur Utama
              </h2>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-slate-700">
              {roleLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={`role-${link.href}`}
                    href={link.href}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors active:bg-sky-100 dark:active:bg-slate-600"
                  >
                    <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 shrink-0">
                      <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{link.label}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate block">{link.desc}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin fallback links for unmapped roles */}
        {!roleLinks.length && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Pilih Panel
              </h2>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-slate-700">
              {FALLBACK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors active:bg-sky-100 dark:active:bg-slate-600"
                >
                  <LayoutDashboard className="h-4 w-4 text-sky-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{link.label}</span>
                  <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Shared destinations — always visible */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50 flex items-center gap-2">
            <Bell className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Akses Umum
            </h2>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-50 dark:divide-slate-700">
            {SHARED_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-start gap-2.5 p-4 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors active:bg-sky-100 dark:active:bg-slate-600 min-h-[44px]"
                >
                  <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block leading-tight">{link.label}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 leading-tight block mt-0.5">{link.desc}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Profile shortcut */}
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm hover:border-sky-300 dark:hover:border-sky-700 transition-colors active:bg-sky-50 dark:active:bg-slate-700"
        >
          <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-slate-700 shrink-0">
            <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Profil Saya</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate block">{user.email}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
        </Link>
      </div>
    </div>
  );
}

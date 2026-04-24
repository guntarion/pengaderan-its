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
import { LayoutDashboard, ChevronRight } from 'lucide-react';

const log = createLogger('m13/dashboard/entry');

// Roles with their own dashboard pages in NAWASENA
const NAWASENA_ROLES = ['MABA', 'KP', 'KASUH', 'OC', 'SC', 'BLM', 'PEMBINA', 'SATGAS'] as const;

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
    // Still loading redirect — show skeleton
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <h1 className="text-xl font-bold">Mengalihkan ke Dashboard {role}...</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // Fallback UI for unmapped roles
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dashboard NAWASENA</h1>
              <p className="text-sm text-white/80">
                Selamat datang, {user.name ?? user.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
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
                className="flex items-center gap-3 px-5 py-3 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-sky-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{link.label}</span>
                <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

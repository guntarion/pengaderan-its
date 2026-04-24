'use client';

/**
 * src/app/(DashboardLayout)/dashboard/safeguard/layout.tsx
 * NAWASENA M10 — Safeguard module layout with role guard + breadcrumb.
 *
 * Allowed roles: SC, PEMBINA, OC, KP, BLM + isSafeguardOfficer flag
 */

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('safeguard-layout');

const ALLOWED_ROLES = ['SC', 'PEMBINA', 'OC', 'KP', 'BLM', 'SATGAS', 'SUPERADMIN'];

export default function SafeguardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    const user = session?.user as { role?: string; isSafeguardOfficer?: boolean } | undefined;
    const role = user?.role ?? '';
    const isSafeguardOfficer = user?.isSafeguardOfficer ?? false;

    const isAllowed = ALLOWED_ROLES.includes(role) || isSafeguardOfficer;

    if (!isAllowed) {
      log.warn('Access denied to safeguard module', { role, isSafeguardOfficer });
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

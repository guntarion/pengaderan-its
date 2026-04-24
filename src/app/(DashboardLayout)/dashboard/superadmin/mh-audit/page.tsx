'use client';

/**
 * src/app/(DashboardLayout)/dashboard/superadmin/mh-audit/page.tsx
 * NAWASENA M11 — Superadmin MH audit log viewer page.
 *
 * Role guard: SUPERADMIN (enforced by API)
 * Every query also creates an AUDIT_REVIEW entry (the audit is audited).
 *
 * PRIVACY-CRITICAL: Only SUPERADMIN can access this page.
 */

import React from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { AuditLogViewer } from '@/components/mental-health/AuditLogViewer';
import { ShieldCheck } from 'lucide-react';

export default function MHAuditLogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="text-white/80 hover:text-white text-sm">&larr;</Link>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <h1 className="text-xl font-bold">MH Audit Log</h1>
            </div>
          </div>
          <p className="text-sm text-white/80">
            Log akses data kesehatan mental. Setiap pencarian di halaman ini juga dicatat.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto max-w-5xl px-4 pt-4">
        <DynamicBreadcrumb
          labels={{
            superadmin: 'Superadmin',
            'mh-audit': 'MH Audit Log',
          }}
        />
      </div>

      {/* Warning */}
      <div className="container mx-auto max-w-5xl px-4 pt-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Peringatan:</strong> Halaman ini berisi audit trail sensitif. Setiap pencarian
            dan akses ke halaman ini dicatat dalam log keamanan (AUDIT_REVIEW).
            Gunakan hanya untuk kebutuhan investigasi keamanan yang sah.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <AuditLogViewer />
      </div>
    </div>
  );
}

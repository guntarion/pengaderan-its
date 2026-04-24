/**
 * src/types/dashboard.ts
 * Shared TypeScript types for M13 Dashboard Multi-Role.
 */

import type { KirkpatrickSnapshot } from '@/lib/dashboard/aggregation/kirkpatrick';
import type { MoodAvgResult, AlertCountResult, UpcomingEvent } from '@/lib/dashboard/aggregation/live-compute';

// Re-export for components to import from @/types/dashboard
export type { UpcomingEvent };

// ============================================
// Widget State — generic state envelope
// ============================================

export type WidgetState<T> =
  | { status: 'loading' }
  | { status: 'data'; data: T }
  | { status: 'empty' }
  | { status: 'partial'; data: Partial<T>; reason: string }
  | { status: 'error'; error: string };

// ============================================
// Dashboard role slugs
// ============================================

export type RoleDashboardKey =
  | 'maba'
  | 'kp'
  | 'kasuh'
  | 'oc'
  | 'sc'
  | 'pembina'
  | 'blm'
  | 'satgas';

// ============================================
// Alert types for widgets
// ============================================

export interface AlertItem {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'DISMISSED' | 'RESOLVED' | 'SNOOZED';
  title: string;
  description?: string;
  targetUrl: string;
  firstSeenAt: string; // ISO string
  computedAt: string;  // ISO string
}

// ============================================
// KPI widget types
// ============================================

export interface KPIMiniData {
  kpiDefId: string;
  label: string;
  value: number | null;
  target: number | null;
  unit?: string;
  period: string;
  trend30d?: number[];
  partial?: boolean;
}

// ============================================
// Compliance widget types
// ============================================

export interface ComplianceData {
  paktaPanitiaPercent: number | null;
  socialContractPercent: number | null;
  forbiddenActViolations: number;
  permen55Checklist: Permen55Item[];
}

export interface Permen55Item {
  id: string;
  label: string;
  status: 'green' | 'yellow' | 'red';
  detail?: string;
}

// ============================================
// Dashboard payloads per role
// ============================================

export interface MabaDashboardPayload {
  userId: string;
  cohortId: string;
  pulseStreak: number;
  passportCompletion: number | null;
  upcomingEvents: UpcomingEvent[];
  moodToday: MoodAvgResult;
  paktaSigned: boolean;
}

export interface OCDashboardPayload {
  userId: string;
  cohortId: string;
  upcomingEventsAsPIC: UpcomingEvent[];
  evaluationPending: number;
  recentNPS: Array<{ eventId: string; eventName: string; avgNps: number; count: number }>;
}

export interface KasuhDashboardPayload {
  userId: string;
  cohortId: string;
  adikAsuhList: Array<{
    id: string;
    name: string;
    pulseStreak: number;
    journalStreak: number;
    moodTrend7d: number[];
  }>;
  upcomingLogbookDeadline?: Date;
}

export interface KPDashboardPayload {
  userId: string;
  cohortId: string;
  moodHeatmap: Array<{ userId: string; name: string; scores: number[] }>;
  activeAlerts: AlertItem[];
  debriefReminder?: string;
  passportReviewQueue: number;
}

export interface BLMDashboardPayload {
  userId: string;
  cohortId: string;
  anonReportQueue: number;
  anonBySeverity: { critical: number; high: number; medium: number; low: number };
  compliance: ComplianceData;
}

export interface PembinaDashboardPayload {
  userId: string;
  cohortId: string;
  kirkpatrick: KirkpatrickSnapshot;
  compliance: ComplianceData;
  criticalAlerts: AlertItem[];
}

export interface SatgasDashboardPayload {
  userId: string;
  cohortId: string;
  severeIncidents: number;
  anonReportCount: number;
  anonReportBySeverity: { critical: number; high: number };
  programStats: {
    totalMaba: number;
    activeMaba: number;
    completedKegiatanCount: number;
  };
}

export interface SCDashboardPayload {
  userId: string;
  cohortId: string;
  kirkpatrick: KirkpatrickSnapshot;
  moodCohort: MoodAvgResult;
  alerts: AlertItem[];
  alertCount: AlertCountResult;
  compliance: ComplianceData;
  anonReportCount: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export type DashboardPayload =
  | MabaDashboardPayload
  | OCDashboardPayload
  | KasuhDashboardPayload
  | KPDashboardPayload
  | BLMDashboardPayload
  | PembinaDashboardPayload
  | SatgasDashboardPayload
  | SCDashboardPayload;

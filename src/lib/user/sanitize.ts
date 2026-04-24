/**
 * src/lib/user/sanitize.ts
 * Field-level access control for user data.
 *
 * Implements § 7 from 06-model-data.md:
 * - All users: id, email, fullName, displayName, role, cohort
 * - MABA/KP/KASUH/OC: no demographics
 * - SC/SATGAS/ELDER: demographics visible, emergency contact requires audit
 * - SUPERADMIN: full access
 */

import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

type UserRole = 'MABA' | 'KP' | 'KASUH' | 'OC' | 'ELDER' | 'SC' | 'PEMBINA' | 'BLM' | 'SATGAS' | 'ALUMNI' | 'DOSEN_WALI' | 'SUPERADMIN';

interface RawUser {
  id: string;
  email: string;
  fullName: string;
  displayName?: string | null;
  nrp?: string | null;
  role: UserRole;
  status: string;
  createdAt: Date;
  // Demographics
  isRantau?: boolean | null;
  isKIP?: boolean | null;
  hasDisability?: boolean | null;
  disabilityNotes?: string | null;
  province?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelation?: string | null;
  emergencyContactPhone?: string | null;
  demographicsUpdatedAt?: Date | null;
}

// Roles that can view demographics
const CAN_VIEW_DEMOGRAPHICS: UserRole[] = ['SC', 'SATGAS', 'ELDER', 'PEMBINA', 'BLM', 'SUPERADMIN'];
// Roles that can view emergency contact (requires audit entry)
const CAN_VIEW_EMERGENCY: UserRole[] = ['SC', 'SATGAS', 'SUPERADMIN'];

export interface SanitizedUser {
  id: string;
  email: string;
  fullName: string;
  displayName?: string | null;
  nrp?: string | null;
  role: UserRole;
  status: string;
  createdAt: Date;
  // Demographics (null if not authorized)
  demographics?: {
    isRantau?: boolean | null;
    isKIP?: boolean | null;
    hasDisability?: boolean | null;
    disabilityNotes?: string | null;
    province?: string | null;
    demographicsUpdatedAt?: Date | null;
  } | null;
  // Emergency contact (null if not authorized)
  emergencyContact?: {
    name?: string | null;
    relation?: string | null;
    phone?: string | null;
  } | null;
}

/**
 * Sanitize user record based on viewer's role.
 * Pass `auditContext` to log emergency contact access.
 */
export async function sanitizeUserForViewer(
  user: RawUser,
  viewerRole: UserRole,
  auditContext?: {
    viewerUserId: string;
    organizationId: string;
    reason?: string;
  }
): Promise<SanitizedUser> {
  const canSeeDemographics = CAN_VIEW_DEMOGRAPHICS.includes(viewerRole);
  const canSeeEmergency = CAN_VIEW_EMERGENCY.includes(viewerRole);

  const sanitized: SanitizedUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    displayName: user.displayName,
    nrp: user.nrp,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };

  if (canSeeDemographics) {
    sanitized.demographics = {
      isRantau: user.isRantau,
      isKIP: user.isKIP,
      hasDisability: user.hasDisability,
      disabilityNotes: user.disabilityNotes,
      province: user.province,
      demographicsUpdatedAt: user.demographicsUpdatedAt,
    };
  }

  if (canSeeEmergency) {
    sanitized.emergencyContact = {
      name: user.emergencyContactName,
      relation: user.emergencyContactRelation,
      phone: user.emergencyContactPhone,
    };

    // Audit log for emergency contact access
    if (auditContext && user.emergencyContactName) {
      await logAudit({
        action: AuditAction.USER_EMERGENCY_CONTACT_ACCESSED,
        organizationId: auditContext.organizationId,
        actorUserId: auditContext.viewerUserId,
        subjectUserId: user.id,
        entityType: 'User',
        entityId: user.id,
        reason: auditContext.reason,
      });
    }
  }

  return sanitized;
}

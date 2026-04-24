/**
 * src/lib/auth/whitelist.ts
 * Email whitelist check for NAWASENA sign-in gate.
 *
 * Allowed if:
 *   1. Email ends with @its.ac.id (ITS domain)
 *   2. OR email is in the WhitelistEmail table for the org
 */

import { prisma } from '@/utils/prisma';
import { UserRole } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth-whitelist');

const ITS_DOMAIN = '@its.ac.id';
const DEFAULT_ORG_CODE = process.env.TENANT_ORG_CODE ?? 'HMTC';

export interface WhitelistResult {
  allowed: boolean;
  preassignedRole?: UserRole;
  preassignedCohortId?: string;
  whitelistEntryId?: string;
}

/**
 * Check if an email is allowed to sign in.
 *
 * @param email   - Email to check (will be lowercased)
 * @param orgCode - Organization code (defaults to TENANT_ORG_CODE)
 */
export async function isEmailAllowed(
  email: string,
  orgCode: string = DEFAULT_ORG_CODE,
): Promise<WhitelistResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. ITS domain check
  if (normalizedEmail.endsWith(ITS_DOMAIN)) {
    log.debug('Email allowed via ITS domain', { email: normalizedEmail });
    return { allowed: true };
  }

  // 2. WhitelistEmail table check
  try {
    const org = await prisma.organization.findUnique({
      where: { code: orgCode },
      select: { id: true },
    });

    if (!org) {
      log.warn('Organization not found for whitelist check', { orgCode });
      return { allowed: false };
    }

    const entry = await prisma.whitelistEmail.findUnique({
      where: {
        organizationId_email: {
          organizationId: org.id,
          email: normalizedEmail,
        },
      },
      select: {
        id: true,
        preassignedRole: true,
        preassignedCohortId: true,
        isConsumed: true,
      },
    });

    if (entry) {
      log.debug('Email found in whitelist', {
        email: normalizedEmail,
        role: entry.preassignedRole,
        consumed: entry.isConsumed,
      });
      return {
        allowed: true,
        preassignedRole: entry.preassignedRole,
        preassignedCohortId: entry.preassignedCohortId ?? undefined,
        whitelistEntryId: entry.id,
      };
    }

    log.debug('Email not in whitelist and not ITS domain', { email: normalizedEmail });
    return { allowed: false };
  } catch (error) {
    log.error('Whitelist check failed', { error, email: normalizedEmail });
    // Fail-closed: deny access on error
    return { allowed: false };
  }
}

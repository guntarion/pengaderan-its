/**
 * src/lib/auth/callbacks.ts
 * NextAuth callbacks for NAWASENA — signIn, jwt, session.
 *
 * Sign-in: validate whitelist → reject non-allowed emails.
 * JWT: inject organizationId, role, cohortId, sessionEpoch, paktaStatus claims.
 * Session: propagate JWT claims to session object.
 */

import type { Account, Profile, Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { prisma } from '@/utils/prisma';
import { UserRole, UserStatus, OrganizationStatus } from '@prisma/client';
import { isEmailAllowed } from './whitelist';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth-callbacks');

const DEFAULT_ORG_CODE = process.env.TENANT_ORG_CODE ?? 'HMTC';
const SENSITIVE_ROLES: UserRole[] = [UserRole.SC, UserRole.PEMBINA, UserRole.SATGAS, UserRole.SUPERADMIN];
const SHORT_TOKEN_EXPIRY_SECONDS = 2 * 60 * 60;  // 2 hours for sensitive roles
const DEFAULT_TOKEN_EXPIRY_SECONDS = 8 * 60 * 60; // 8 hours for others

// Bootstrap superadmins — bypass whitelist + force SUPERADMIN role on every sign-in.
const SUPERADMIN_EMAILS: readonly string[] = ['guntarion@gmail.com'];
const isSuperadminEmail = (email: string) => SUPERADMIN_EMAILS.includes(email.toLowerCase().trim());

// ============================================================
// signIn callback — whitelist gate
// ============================================================

export async function signInCallback(params: {
  user: User;
  account: Account | null;
  profile?: Profile;
  isNewUser?: boolean;
}): Promise<boolean | string> {
  const email = params.user.email;
  if (!email) {
    log.warn('Sign-in rejected: no email');
    return false;
  }

  if (isSuperadminEmail(email)) {
    log.info('Sign-in allowed (bootstrap superadmin)', { email });
    return true;
  }

  const whitelist = await isEmailAllowed(email);
  if (!whitelist.allowed) {
    log.warn('Sign-in rejected: email not whitelisted', { email });
    return '/auth/login?error=EmailNotAllowed';
  }

  log.info('Sign-in allowed', { email });
  return true;
}

// ============================================================
// jwt callback — inject NAWASENA claims
// ============================================================

export async function jwtCallback(params: {
  token: JWT;
  user?: User;
  account?: Account | null;
  trigger?: 'signIn' | 'signUp' | 'update';
  session?: Session;
}): Promise<JWT> {
  const { token, user, trigger } = params;

  // On sign-in: fetch/create DB user and inject claims
  if (trigger === 'signIn' && user?.email) {
    const email = user.email.toLowerCase().trim();

    log.info('JWT first sign-in, resolving user', { email });

    // Get default org
    const defaultOrg = await prisma.organization.findFirst({
      where: { code: DEFAULT_ORG_CODE, status: OrganizationStatus.ACTIVE },
      select: { id: true, code: true },
    });

    if (!defaultOrg) {
      log.error('Default organization not found', { orgCode: DEFAULT_ORG_CODE });
      throw new Error('System configuration error: default organization not found');
    }

    // Check whitelist for preassigned role/cohort
    const whitelistResult = await isEmailAllowed(email);
    const isBootstrap = isSuperadminEmail(email);
    const preassignedRole = isBootstrap
      ? UserRole.SUPERADMIN
      : (whitelistResult.preassignedRole ?? UserRole.MABA);
    const preassignedCohortId = whitelistResult.preassignedCohortId;

    // Upsert user
    let dbUser = await prisma.user.findUnique({
      where: { email },
      include: { currentCohort: { select: { id: true, code: true } } },
    });

    if (!dbUser) {
      // Create new user
      dbUser = await prisma.user.create({
        data: {
          email,
          fullName: user.name ?? email.split('@')[0],
          displayName: user.name ?? undefined,
          image: user.image ?? undefined,
          organizationId: defaultOrg.id,
          currentCohortId: preassignedCohortId ?? undefined,
          role: preassignedRole,
          status: preassignedRole === UserRole.SUPERADMIN ? UserStatus.ACTIVE : UserStatus.PENDING_PROFILE_SETUP,
          lastLoginAt: new Date(),
        },
        include: { currentCohort: { select: { id: true, code: true } } },
      });

      // Mark whitelist entry consumed
      if (whitelistResult.whitelistEntryId) {
        await prisma.whitelistEmail.update({
          where: { id: whitelistResult.whitelistEntryId },
          data: {
            isConsumed: true,
            consumedAt: new Date(),
            consumedByUserId: dbUser.id,
          },
        });
      }

      log.info('New user created', { userId: dbUser.id, email, role: dbUser.role });
    } else {
      // Existing user — update last login + self-heal SUPERADMIN bootstrap
      const shouldPromoteToSuperadmin = isBootstrap && dbUser.role !== UserRole.SUPERADMIN;
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          lastLoginAt: new Date(),
          ...(shouldPromoteToSuperadmin && {
            role: UserRole.SUPERADMIN,
            status: UserStatus.ACTIVE,
          }),
        },
        include: { currentCohort: { select: { id: true, code: true } } },
      });

      if (shouldPromoteToSuperadmin) {
        log.warn('Existing user promoted to SUPERADMIN (bootstrap)', { userId: dbUser.id, email });
      } else {
        log.info('Existing user signed in', { userId: dbUser.id, email, role: dbUser.role });
      }
    }

    // Inject NAWASENA claims into JWT
    token.userId = dbUser.id;
    token.organizationId = dbUser.organizationId;
    token.role = dbUser.role;
    token.currentCohortId = dbUser.currentCohortId ?? null;
    token.sessionEpoch = dbUser.sessionEpoch;
    token.paktaPanitiaStatus = dbUser.paktaPanitiaStatus;
    token.socialContractStatus = dbUser.socialContractStatus;
    token.paktaPengader2027Status = dbUser.paktaPengader2027Status;
    token.userStatus = dbUser.status;

    // Set expiry based on role sensitivity
    const expirySeconds = SENSITIVE_ROLES.includes(dbUser.role as UserRole)
      ? SHORT_TOKEN_EXPIRY_SECONDS
      : DEFAULT_TOKEN_EXPIRY_SECONDS;
    token.exp = Math.floor(Date.now() / 1000) + expirySeconds;

    return token;
  }

  // On update trigger (e.g., role change via useSession().update())
  if (trigger === 'update' && token.userId) {
    log.info('JWT update triggered, refreshing claims', { userId: token.userId });

    const dbUser = await prisma.user.findUnique({
      where: { id: token.userId as string },
      select: {
        id: true,
        role: true,
        status: true,
        organizationId: true,
        currentCohortId: true,
        sessionEpoch: true,
        paktaPanitiaStatus: true,
        socialContractStatus: true,
        paktaPengader2027Status: true,
      },
    });

    if (dbUser) {
      token.role = dbUser.role;
      token.userStatus = dbUser.status;
      token.organizationId = dbUser.organizationId;
      token.currentCohortId = dbUser.currentCohortId ?? null;
      token.sessionEpoch = dbUser.sessionEpoch;
      token.paktaPanitiaStatus = dbUser.paktaPanitiaStatus;
      token.socialContractStatus = dbUser.socialContractStatus;
      token.paktaPengader2027Status = dbUser.paktaPengader2027Status;
    }
  }

  return token;
}

// ============================================================
// session callback — propagate JWT claims to client session
// ============================================================

export async function sessionCallback(params: {
  session: Session;
  token: JWT;
}): Promise<Session> {
  const { session, token } = params;

  // Propagate all NAWASENA claims to session.user
  if (session.user) {
    session.user.id = token.userId as string;
    session.user.role = token.role as string;
    session.user.organizationId = token.organizationId as string;
    session.user.currentCohortId = (token.currentCohortId as string | null) ?? undefined;
    session.user.sessionEpoch = token.sessionEpoch as number;
    session.user.paktaPanitiaStatus = token.paktaPanitiaStatus as string | null | undefined;
    session.user.socialContractStatus = token.socialContractStatus as string | null | undefined;
    session.user.paktaPengader2027Status = token.paktaPengader2027Status as string | null | undefined;
    session.user.userStatus = token.userStatus as string;
  }

  return session;
}

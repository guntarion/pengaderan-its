// src/app/api/auth/[...nextauth]/options.ts
// NAWASENA NextAuth configuration.
// Uses JWT strategy with NAWASENA-extended claims (organizationId, role, cohortId, paktaStatus).

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/utils/prisma';
import { signInCallback, jwtCallback, sessionCallback } from '@/lib/auth/callbacks';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth-options');

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    // Note: Credentials (password) provider removed — NAWASENA uses OAuth + magic-link only.
    // Email magic-link via Resend or NodeMailer can be added here if needed (Phase 2 extension).
  ],

  adapter: PrismaAdapter(prisma),

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours default (shortened for sensitive roles in jwt callback)
  },

  callbacks: {
    signIn: signInCallback,
    jwt: jwtCallback,
    session: sessionCallback,
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  events: {
    createUser: async ({ user }) => {
      // User creation is handled in jwt callback for NAWASENA.
      // This event fires for PrismaAdapter-created users (OAuth flow).
      log.info('NextAuth createUser event', { email: user.email });
    },
    signIn: async ({ user, isNewUser }) => {
      log.info('User signed in', { email: user.email, isNewUser });
    },
    signOut: async ({ token }) => {
      log.info('User signed out', { userId: token?.sub });
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

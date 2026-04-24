// src/types/next-auth.d.ts
// NAWASENA type augmentation for NextAuth session and JWT.
// Adds organizationId, role (NAWASENA enum), cohortId, paktaStatus claims.

import { DefaultSession } from 'next-auth';
import { JWT as DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;

      // NAWASENA additions
      role: string;                         // UserRole enum value
      organizationId: string;               // FK to Organization
      currentCohortId?: string | null;      // FK to Cohort (null for cross-cohort roles)
      sessionEpoch: number;                 // For forced re-login detection
      userStatus: string;                   // UserStatus enum value

      // Pakta status (denormalized for middleware gate)
      paktaPanitiaStatus?: string | null;
      socialContractStatus?: string | null;
      paktaPengader2027Status?: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
    organizationId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    // NAWASENA JWT claims
    userId?: string;
    role?: string;
    organizationId?: string;
    currentCohortId?: string | null;
    sessionEpoch?: number;
    userStatus?: string;
    paktaPanitiaStatus?: string | null;
    socialContractStatus?: string | null;
    paktaPengader2027Status?: string | null;
  }
}

// src/providers/SessionProvider.tsx
'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { Suspense } from 'react';
import LoadingScreen from '@/components/shared/LoadingScreen';

/**
 * Session provider wrapper for NextAuth
 * Provides session context to client components with optimized loading state
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
    </NextAuthSessionProvider>
  );
}

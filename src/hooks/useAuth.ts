// src/hooks/useAuth.ts
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useCallback, useMemo } from 'react';

/**
 * Custom hook for authentication operations
 * Provides optimized session data and memoized authentication methods
 */
export function useAuth() {
  const { data: session, status } = useSession();

  // Memoize derived state
  const isAuthenticated = useMemo(() => status === 'authenticated', [status]);
  const isLoading = useMemo(() => status === 'loading', [status]);
  const user = useMemo(() => session?.user, [session]);

  /**
   * Check if user has required role
   * Memoized to prevent unnecessary recalculations
   */
  const hasRole = useCallback(
    (requiredRole: string | string[]) => {
      if (!isAuthenticated || !user) return false;

      if (Array.isArray(requiredRole)) {
        return requiredRole.includes(user.role);
      }

      // Admin can access all roles
      if (user.role === 'admin') return true;

      return user.role === requiredRole;
    },
    [isAuthenticated, user]
  );

  /**
   * Sign out and redirect to home page
   * Memoized to maintain referential equality
   */
  const logout = useCallback(() => {
    signOut({ callbackUrl: '/' });
  }, []);

  /**
   * Sign in with Google
   * Memoized to maintain referential equality
   */
  const loginWithGoogle = useCallback((callbackUrl = '/') => {
    signIn('google', { callbackUrl });
  }, []);

  // Return memoized values and functions
  return {
    session,
    status,
    isAuthenticated,
    isLoading,
    user,
    hasRole,
    loginWithGoogle,
    logout,
  };
}

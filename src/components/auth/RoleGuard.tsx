// src/components/auth/RoleGuard.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackUrl?: string;
}

/**
 * Component to protect routes based on user roles
 * Redirects to fallback URL if user doesn't have required role
 */
export default function RoleGuard({ children, allowedRoles, fallbackUrl = '/auth/unauthorized' }: RoleGuardProps) {
  const { hasRole, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until authentication status is determined
    if (!isLoading) {
      // Redirect if not authenticated or doesn't have required role
      if (!isAuthenticated || !hasRole(allowedRoles)) {
        router.push(fallbackUrl);
      }
    }
  }, [isAuthenticated, hasRole, isLoading, router, allowedRoles, fallbackUrl]);

  // Show loading state
  if (isLoading) {
    return <div className='flex justify-center items-center h-screen'>Loading...</div>;
  }

  // Show content if user has required role
  if (isAuthenticated && hasRole(allowedRoles)) {
    return <>{children}</>;
  }

  // Show nothing while redirecting
  return null;
}

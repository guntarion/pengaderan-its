'use client';

import React, { useEffect, useState } from 'react';
import Logo from '@/components/layout/shared/logo/Logo';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

/**
 * Reset Password page
 * Allows users to set a new password using a reset token
 */
const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
        const data = await response.json();

        setTokenValid(response.ok);
        if (!response.ok) {
          setError(data.message || 'Invalid or expired token');
        }
      } catch {
        setError('Failed to validate token');
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    if (token) {
      validateToken();
    } else {
      setError('No reset token provided');
      setValidating(false);
      setTokenValid(false);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess(true);

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className='relative overflow-hidden h-screen bg-muted'>
      <div className='flex h-full justify-center items-center px-4'>
        <div className='rounded-lg shadow-md bg-background p-6 relative w-full md:w-[450px]'>
          <div className='flex h-full flex-col justify-center gap-2 w-full'>
            <div className='mx-auto'>
              <Logo />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Show loading state while validating token
  if (validating) {
    return (
      <PageWrapper>
        <p className='text-sm text-center text-muted-foreground my-3'>Validating your reset token...</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <h1 className='text-xl font-semibold text-center mb-2'>Reset Password</h1>

      {!tokenValid ? (
        <div className='mt-4 space-y-4'>
          <Alert variant='destructive'>
            <AlertTitle>Invalid or Expired Link</AlertTitle>
            <AlertDescription>{error || 'This password reset link is invalid or has expired. Please request a new one.'}</AlertDescription>
          </Alert>
          <div className='text-center'>
            <Link href='/auth/forgot-password' className='text-primary hover:underline font-medium'>
              Request New Reset Link
            </Link>
          </div>
        </div>
      ) : success ? (
        <div className='mt-4 space-y-4'>
          <Alert>
            <AlertTitle>Password Reset Successful!</AlertTitle>
            <AlertDescription>Your password has been reset successfully. You will be redirected to the login page shortly.</AlertDescription>
          </Alert>
          <div className='text-center'>
            <Link href='/auth/login' className='text-primary hover:underline font-medium'>
              Go to Login
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className='text-sm text-center text-muted-foreground my-3'>Enter your new password below.</p>

          {error && (
            <Alert variant='destructive' className='mb-4'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='password'>New Password</Label>
              <Input id='password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Confirm Password</Label>
              <Input id='confirmPassword' type='password' value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            <Button className='w-full' type='submit' disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </>
      )}
    </PageWrapper>
  );
};

export default ResetPasswordPage;

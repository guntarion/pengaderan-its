'use client';

import React, { useState } from 'react';
import Logo from '@/components/layout/shared/logo/Logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

/**
 * Forgot Password page
 * Allows users to request a password reset link via email
 */
const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative overflow-hidden h-screen bg-muted'>
      <div className='flex h-full justify-center items-center px-4'>
        <div className='rounded-lg shadow-md bg-background p-6 relative w-full md:w-[450px]'>
          <div className='flex h-full flex-col justify-center gap-2 w-full'>
            <div className='mx-auto'>
              <Logo />
            </div>
            <h1 className='text-xl font-semibold text-center mb-2'>Lupa Password</h1>

            {success ? (
              <div className='mt-4 space-y-4'>
                <Alert variant='default'>
                  <AlertTitle>Periksa email Anda!</AlertTitle>
                  <AlertDescription>
                    Kami telah mengirimkan tautan pengaturan ulang kata sandi ke alamat email Anda. Silakan periksa kotak masuk (inbox) dan folder
                    spam Anda.
                  </AlertDescription>
                </Alert>
                <div className='text-center'>
                  <Link href='/auth/login' className='text-primary hover:underline font-medium'>
                    Kembali ke Login
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <p className='text-sm text-center text-muted-foreground my-3'>
                  Harap masukkan email Anda di bawah ini dan kami akan mengirimkan tautan untuk mengatur ulang kata sandi Anda.
                </p>

                {error && (
                  <Alert variant='destructive' className='mb-4'>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='email'>Email Address</Label>
                    <Input id='email' type='email' value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>

                  <Button className='w-full' type='submit' disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>

                <div className='flex gap-2 items-center justify-center mt-6'>
                  <p className='text-muted-foreground'>Sudah ingat password?</p>
                  <Link href='/auth/login' className='text-primary hover:underline font-medium'>
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { FcGoogle } from 'react-icons/fc';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Enhanced login component with Google sign-in only
 */
const AuthLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { loginWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  // Show error from URL if present
  const urlError = searchParams.get('error') ? decodeURIComponent(searchParams.get('error') || '') : '';

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle(callbackUrl);
    } catch (err) {
      console.error('Google auth error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {(error || urlError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error || urlError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold text-blue-800">Login to Guntar-NextJS</h2>
        <p className="text-gray-600">Modern web application platform built with Next.js</p>
      </div>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 text-gray-500 bg-white">Masuk dengan</span>
        </div>
      </div>

      <Button
        onClick={handleGoogleLogin}
        variant="outline"
        className="w-full py-6 border-2 hover:bg-gray-50 transition-colors"
        type="button"
        disabled={loading}
      >
        <div className="flex items-center justify-center w-full">
          <FcGoogle className="h-6 w-6 mr-3" />
          <span className="text-base font-medium">{loading ? 'Memproses...' : 'Masuk dengan Google'}</span>
        </div>
      </Button>

      <div className="pt-4 text-center">
        <p className="text-sm text-gray-600">
          Dengan masuk, Anda menyetujui <Link href="/terms" className="text-blue-600 hover:underline">Ketentuan Layanan</Link> dan {' '}
          <Link href="/privacy" className="text-blue-600 hover:underline">Kebijakan Privasi</Link> kami
        </p>
      </div>
    </div>
  );
};

export default AuthLogin;

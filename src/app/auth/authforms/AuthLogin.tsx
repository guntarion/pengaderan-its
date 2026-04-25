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
    <div className="space-y-5">
      {(error || urlError) && (
        <Alert variant="destructive">
          <AlertDescription>{error || urlError}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleGoogleLogin}
        variant="outline"
        className="w-full h-12 border-sky-200 hover:bg-sky-50 hover:border-sky-300 dark:border-sky-900 dark:hover:bg-sky-950 transition-colors"
        type="button"
        disabled={loading}
      >
        <FcGoogle className="h-5 w-5 mr-3" />
        <span className="text-sm font-medium">
          {loading ? 'Memproses...' : 'Masuk dengan akun Google'}
        </span>
      </Button>

      <p className="text-xs text-center text-muted-foreground leading-relaxed">
        Dengan masuk, Anda menyetujui{' '}
        <Link href="/terms" className="text-sky-700 dark:text-sky-400 hover:underline">
          Ketentuan Layanan
        </Link>{' '}
        dan{' '}
        <Link href="/mental-health/faq" className="text-sky-700 dark:text-sky-400 hover:underline">
          Kebijakan Privasi
        </Link>
        .
      </p>
    </div>
  );
};

export default AuthLogin;

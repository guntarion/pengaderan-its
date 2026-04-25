'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { FcGoogle } from 'react-icons/fc';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const AuthRegister = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { loginWithGoogle } = useAuth();

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle('/dashboard');
    } catch (err) {
      console.error('Google auth error:', err);
      setError('Terjadi kesalahan saat pendaftaran. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleGoogleSignup}
        variant="outline"
        className="w-full h-12 border-sky-200 hover:bg-sky-50 hover:border-sky-300 dark:border-sky-900 dark:hover:bg-sky-950 transition-colors"
        type="button"
        disabled={loading}
      >
        <FcGoogle className="h-5 w-5 mr-3" />
        <span className="text-sm font-medium">
          {loading ? 'Memproses...' : 'Daftar dengan akun Google'}
        </span>
      </Button>

      <p className="text-xs text-center text-muted-foreground leading-relaxed">
        Dengan mendaftar, Anda menyetujui{' '}
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

export default AuthRegister;

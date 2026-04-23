'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { FcGoogle } from 'react-icons/fc';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Rocket, Shield, Users } from 'lucide-react';

/**
 * Enhanced register component with Google sign-up only
 */
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
      setError('An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold text-blue-800">Join Guntar-NextJS</h2>
        <p className="text-gray-600">Modern web application platform for your needs</p>
      </div>

      {/* Benefits section */}
      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 my-6">
        <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-3">Keuntungan Mendaftar:</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300">Akses ke fitur rekomendasi AI seragam yang canggih</p>
          </div>
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300">Keamanan data dengan otentikasi Google</p>
          </div>
          <div className="flex items-start">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300">Kelola kebutuhan seragam organisasi dalam satu platform</p>
          </div>
        </div>
      </div>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 text-gray-500 bg-white">Daftar dengan</span>
        </div>
      </div>

      <Button
        onClick={handleGoogleSignup}
        variant="outline"
        className="w-full py-6 border-2 hover:bg-gray-50 transition-colors"
        type="button"
        disabled={loading}
      >
        <div className="flex items-center justify-center w-full">
          <FcGoogle className="h-6 w-6 mr-3" />
          <span className="text-base font-medium">{loading ? 'Memproses...' : 'Daftar dengan Google'}</span>
        </div>
      </Button>

      <div className="pt-4 text-center">
        <p className="text-sm text-gray-600">
          Dengan mendaftar, Anda menyetujui <Link href="/terms" className="text-blue-600 hover:underline">Ketentuan Layanan</Link> dan {' '}
          <Link href="/privacy" className="text-blue-600 hover:underline">Kebijakan Privasi</Link> kami
        </p>
      </div>
    </div>
  );
};

export default AuthRegister;

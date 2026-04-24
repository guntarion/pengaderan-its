// src/app/api/auth/forgot-password/route.ts
// NAWASENA: Password reset is not supported.
// Authentication uses Google OAuth + (future) magic-link only.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      message:
        'Password reset is not supported in NAWASENA. Please use Google OAuth to sign in.',
    },
    { status: 404 },
  );
}

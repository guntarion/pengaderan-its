// src/app/api/auth/reset-password/route.ts
// NAWASENA: Password reset is not supported.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { message: 'Password reset is not supported in NAWASENA. Use Google OAuth to sign in.' },
    { status: 404 },
  );
}

// src/app/api/auth/validate-reset-token/route.ts
// NAWASENA: Password reset tokens are not supported.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { message: 'Password reset is not supported in NAWASENA. Use Google OAuth to sign in.' },
    { status: 404 },
  );
}

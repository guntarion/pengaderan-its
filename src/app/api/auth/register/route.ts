// src/app/api/auth/register/route.ts
// NAWASENA: Self-registration via password is not supported.
// Users are pre-loaded via whitelist or @its.ac.id domain.
// Authentication uses Google OAuth + (future) magic-link only.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      message:
        'Self-registration is not supported in NAWASENA. ' +
        'Contact your SC to be added to the whitelist, or sign in with your @its.ac.id Google account.',
    },
    { status: 403 },
  );
}

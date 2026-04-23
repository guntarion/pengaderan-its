// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/utils/prisma';
import { sendEmail, generatePasswordResetEmail } from '@/utils/email';

/**
 * API route for handling password reset requests
 * Generates a token and sends a reset email
 *
 * Force dynamic to ensure proper email sending
 */
export const dynamic = 'force-dynamic';

/**
 * POST handler for password reset requests
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    // Find user by email using Prisma
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({ message: 'If a user with that email exists, we have sent them a password reset link' }, { status: 200 });
    }

    // If user registered with Google (no password), don't allow reset
    if (!user.password) {
      return NextResponse.json({ message: 'This account uses Google sign-in and cannot reset password' }, { status: 400 });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Token valid for 1 hour

    // Update user with reset token using Prisma
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry: tokenExpiry,
      },
    });

    // Generate reset link
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password/${resetToken}`;

    // Send email
    await sendEmail({
      to: email,
      subject: 'Password Reset',
      html: generatePasswordResetEmail(user.name, resetLink),
    });

    return NextResponse.json({ message: 'Password reset link sent' }, { status: 200 });
  } catch (error) {
    console.error('Error in forgot password:', error);
    return NextResponse.json({ message: 'An error occurred while processing your request' }, { status: 500 });
  }
}

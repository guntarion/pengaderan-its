// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from './options';

/**
 * NextAuth route handler
 * This exposes the NextAuth API routes needed for authentication
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

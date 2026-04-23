// src/types/next-auth.d.ts
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      email: string;
      image?: string;
      name?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
  }
}

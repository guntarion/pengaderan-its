// src/app/api/auth/[...nextauth]/options.ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/utils/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find user by email using Prisma
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          // If user doesn't exist or has no password (e.g., Google sign-in only)
          if (!user || !user.password) {
            console.log('User not found or no password:', credentials.email);
            return null;
          }

          // Compare passwords
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            console.log('Invalid password for user:', credentials.email);
            return null;
          }

          // Return user object
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image || undefined,
            role: user.role || 'member',
          };
        } catch (error) {
          console.error('Error in authorize function:', error);
          return null;
        }
      },
    }),
  ],
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  // Rest of the code remains the same...
  callbacks: {
    async signIn({ user }) {
      // When a user signs in, ensure they have a role
      try {
        if (!user.email) return true;

        // Check if the user already exists and has a role
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser && !existingUser.role) {
          // User exists but doesn't have a role, add default role
          let role: 'admin' | 'member' | 'moderator' | 'editor' | 'viewer' | 'guest' = 'member';

          // Special case for your admin user
          if (user.email === 'guntarion@gmail.com') {
            role = 'admin';
          }

          await prisma.user.update({
            where: { email: user.email },
            data: { role },
          });
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return true; // Continue sign in even if there's an error
      }
    },
    async jwt({ token, user }) {
      try {
        // If we have a user, get their role from the database
        if (user?.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (dbUser) {
            token.role = dbUser.role || 'member';
            token.id = dbUser.id;
          }
        }
      } catch (error) {
        console.error('Error in jwt callback:', error);
      }

      return token;
    },
    async session({ session, token }) {
      // Add role to the session
      if (session?.user) {
        session.user.role = (token.role as string) || 'member';
        session.user.id = token.id as string;
      }

      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  events: {
    createUser: async ({ user }) => {
      // When a user is created, ensure they have a role
      try {
        if (!user.email) return;

        // Set default role for the new user
        let role: 'admin' | 'member' | 'moderator' | 'editor' | 'viewer' | 'guest' = 'member';

        // Set admin role for your email
        if (user.email === 'guntarion@gmail.com') {
          role = 'admin';
        }

        await prisma.user.update({
          where: { email: user.email },
          data: { role },
        });
      } catch (error) {
        console.error('Error in createUser event:', error);
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

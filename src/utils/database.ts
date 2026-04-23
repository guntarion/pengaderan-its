// src/utils/database.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from './prisma';
import { MongoClient } from 'mongodb';

// MongoDB client for legacy usage
const MONGODB_URI = process.env.MONGODB_URI || '';
const mongoClient = new MongoClient(MONGODB_URI);
let mongoClientPromise: Promise<MongoClient>;

if (!MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };
  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = mongoClient.connect();
  }
  mongoClientPromise = globalWithMongo._mongoClientPromise;
} else {
  mongoClientPromise = mongoClient.connect();
}

/**
 * Get MongoDB client (for legacy usage)
 */
export async function getMongoClient() {
  return mongoClientPromise;
}

/**
 * Get the current user from NextAuth session using Prisma (PostgreSQL)
 * This is the default method
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        namaPanggilan: true,
        nomerHandphone: true,
        gender: true,
        tanggalLahir: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Error fetching current user from Prisma:', error);
    return null;
  }
}

/**
 * Get the current user from MongoDB (legacy)
 * Use this when you need MongoDB-specific functionality
 */
export async function getCurrentUserMongo() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  try {
    const client = await getMongoClient();
    const db = client.db();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      email: session.user.email
    });

    return user;
  } catch (error) {
    console.error('Error fetching current user from MongoDB:', error);
    return null;
  }
}

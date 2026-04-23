// src/utils/mongodb.ts
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * Define the mongoose connection cache type
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

interface MongoClientCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

/**
 * Declare the global mongoose cache to prevent TypeScript errors
 */
declare global {
  var mongoose: MongooseCache | undefined;
  var mongoClient: MongoClientCache | undefined;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };
const cachedClient: MongoClientCache = global.mongoClient || { client: null, promise: null };

// Set global mongoose cache
if (!global.mongoose) {
  global.mongoose = cached;
}

if (!global.mongoClient) {
  global.mongoClient = cachedClient;
}

/**
 * Connect to MongoDB database using mongoose
 * This function ensures a single connection is reused to avoid multiple connections
 */
export async function connectToMongoose() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Connect to MongoDB database using MongoClient
 * Returns a MongoClient instance for direct database operations
 */
export async function connectToDatabase() {
  if (cachedClient.client) {
    return cachedClient.client;
  }

  if (!cachedClient.promise) {
    const opts = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    cachedClient.promise = MongoClient.connect(MONGODB_URI, opts).then((client) => {
      return client;
    });
  }

  try {
    cachedClient.client = await cachedClient.promise;
  } catch (e) {
    cachedClient.promise = null;
    throw e;
  }

  return cachedClient.client;
}

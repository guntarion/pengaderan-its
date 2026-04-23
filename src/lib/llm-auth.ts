// src/lib/llm-auth.ts
// LLM API Key authentication for programmatic access.
//
// Allows external AI systems (Claude Code, automated scripts, pipelines)
// to call API routes without browser-based NextAuth sessions.
//
// Client sends: Authorization: Bearer <LLM_API_KEY>
//           or: x-api-key: <LLM_API_KEY>
//
// Returns an admin-level user context on success, null on failure.

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('llm-auth');

export interface LLMAuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Verify LLM API key from request headers.
 *
 * Accepts two header formats:
 *   - Authorization: Bearer <key>
 *   - x-api-key: <key>
 *
 * On success, returns the admin user from the database (guntarion@gmail.com).
 * On failure, returns null — caller should fall back to getServerSession().
 */
export async function verifyLLMAuth(request: Request): Promise<LLMAuthUser | null> {
  const envKey = process.env.LLM_API_KEY;
  if (!envKey) return null; // LLM auth not configured

  // Extract key from headers
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');

  let providedKey: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    providedKey = apiKeyHeader.trim();
  }

  if (!providedKey || providedKey !== envKey) return null;

  // Valid key — look up the admin user to get a real user ID
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true, email: true, name: true, role: true },
    });

    if (adminUser) {
      return {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      };
    }

    // No admin user in DB — return synthetic context
    return {
      id: 'llm-system',
      email: 'llm@system',
      name: 'LLM System',
      role: 'admin',
    };
  } catch (error) {
    log.error('Database error during LLM auth', { error });
    // Still return synthetic context on DB error so LLM can proceed
    return {
      id: 'llm-system',
      email: 'llm@system',
      name: 'LLM System',
      role: 'admin',
    };
  }
}

/**
 * Get authenticated user from either LLM API key or NextAuth session.
 * Checks LLM key first (fast path for programmatic access),
 * then falls back to getServerSession().
 *
 * Usage:
 *   const user = await getAuthUser(request);
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 */
export async function getAuthUser(
  request: Request
): Promise<LLMAuthUser | null> {
  // Try LLM key first
  const llmUser = await verifyLLMAuth(request);
  if (llmUser) return llmUser;

  // Fall back to NextAuth session
  // Dynamic import to avoid circular dependencies
  const { getServerSession } = await import('next-auth');
  const { authOptions } = await import('@/app/api/auth/[...nextauth]/options');
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) return null;

  return {
    id: session.user.id as string,
    email: session.user.email || '',
    name: session.user.name || '',
    role: (session.user as { role?: string }).role || 'member',
  };
}

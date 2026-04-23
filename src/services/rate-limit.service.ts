// src/services/rate-limit.service.ts
// Monthly AI quota tracking — database-first, Redis optional cache.
// For per-request rate limiting see: src/lib/ratelimit.ts
//
// Default: 300 operations per user per month.

import { prisma } from '@/utils/prisma';
import { getRedisClient, isRedisConfigured, REDIS_KEYS } from '@/lib/redis';
import { createLogger } from '@/lib/logger';

const log = createLogger('rate-limit-service');

export const MONTHLY_LIMIT = 300;

// Credit costs per operation (calibrate against real token usage).
// Guidelines:
//   1 credit  → <1,500 total tokens,  simple output
//   2 credits → 1,500–3,000 tokens,  structured JSON, moderate context
//   3 credits → 3,000–4,500 tokens,  heavy context, complex output
//   4+ credits → web search, deep research
export const OPERATION_COSTS: Record<string, number> = {
  // General chat / assistant
  chat_message: 1,

  // Text generation
  text_generate: 2,          // Generate structured content
  text_improve: 1,           // Rewrite/improve existing text
  text_summarize: 1,         // Summarize content
  text_translate: 1,         // Translate text

  // Analysis operations
  content_analyze: 2,        // Analyze content structure or quality
  sentiment_analyze: 1,      // Sentiment / tone analysis
  data_extract: 2,           // Extract structured data from text

  // Image / vision
  vision_analyze: 2,         // Analyze an image with AI

  // Web search (Perplexity)
  web_search: 3,             // Perplexity Sonar single query
  web_search_pro: 5,         // Perplexity Sonar Pro
};

export type OperationType = keyof typeof OPERATION_COSTS;

export interface UsageStats {
  userId: string;
  year: number;
  month: number;
  operationCount: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  breakdown: {
    chatMessages: number;
    textOperations: number;
    analysisOperations: number;
    visionOperations: number;
    otherOperations: number;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate: Date;
  message?: string;
}

class RateLimitService {
  private getRedis() {
    return isRedisConfigured() ? getRedisClient() : null;
  }

  /**
   * Check if user has enough quota for an operation.
   */
  async checkLimit(userId: string, operationType: OperationType = 'chat_message'): Promise<RateLimitResult> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const cost = OPERATION_COSTS[operationType] ?? 1;

    const usage = await this.getOrCreateUsage(userId, year, month);
    const remaining = usage.limit - usage.operationCount;
    const resetDate = new Date(year, month, 1);

    if (remaining < cost) {
      return {
        allowed: false,
        remaining: Math.max(0, remaining),
        limit: usage.limit,
        resetDate,
        message: `Monthly AI quota exhausted. Resets on ${resetDate.toLocaleDateString()}.`,
      };
    }

    return { allowed: true, remaining: remaining - cost, limit: usage.limit, resetDate };
  }

  /**
   * Record usage of a successful AI operation.
   * Always call AFTER the AI call succeeds — not before, not on failure.
   */
  async recordUsage(
    userId: string,
    operationType: OperationType,
    metadata?: {
      aiProvider?: string;
      modelUsed?: string;
      tokensUsed?: number;
      responseTime?: number;
      inputTokens?: number;
      outputTokens?: number;
      costUSD?: number;
    }
  ): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const cost = OPERATION_COSTS[operationType] ?? 1;

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) {
      log.warn('User not found, skipping usage record', { userId });
      return;
    }

    // Classify operation for breakdown field
    const isChatOp = operationType === 'chat_message';
    const isTextOp = ['text_generate', 'text_improve', 'text_summarize', 'text_translate'].includes(operationType);
    const isAnalysisOp = ['content_analyze', 'sentiment_analyze', 'data_extract'].includes(operationType);
    const isVisionOp = operationType === 'vision_analyze';

    await prisma.aIUsage.upsert({
      where: { userId_year_month: { userId, year, month } },
      update: {
        operationCount: { increment: cost },
        totalTokensUsed: { increment: metadata?.tokensUsed || 0 },
        totalCostUSD: { increment: metadata?.costUSD || 0 },
        totalInputTokens: { increment: metadata?.inputTokens || 0 },
        totalOutputTokens: { increment: metadata?.outputTokens || 0 },
        ...(isChatOp && { chatMessages: { increment: 1 } }),
        ...(isTextOp && { textOperations: { increment: 1 } }),
        ...(isAnalysisOp && { analysisOperations: { increment: 1 } }),
        ...(isVisionOp && { visionOperations: { increment: 1 } }),
        ...(!isChatOp && !isTextOp && !isAnalysisOp && !isVisionOp && { otherOperations: { increment: 1 } }),
      },
      create: {
        userId,
        year,
        month,
        operationCount: cost,
        limit: MONTHLY_LIMIT,
        totalTokensUsed: metadata?.tokensUsed || 0,
        totalCostUSD: metadata?.costUSD || 0,
        totalInputTokens: metadata?.inputTokens || 0,
        totalOutputTokens: metadata?.outputTokens || 0,
        chatMessages:      isChatOp ? 1 : 0,
        textOperations:    isTextOp ? 1 : 0,
        analysisOperations: isAnalysisOp ? 1 : 0,
        visionOperations:  isVisionOp ? 1 : 0,
        otherOperations:   (!isChatOp && !isTextOp && !isAnalysisOp && !isVisionOp) ? 1 : 0,
      },
    });

    // Update Redis cache
    const redis = this.getRedis();
    if (redis) {
      try {
        const key = REDIS_KEYS.monthlyUsage(userId, year, month);
        await redis.hincrby(key, 'operationCount', cost);
        const expiry = Math.floor((new Date(year, month + 1, 1).getTime() - Date.now()) / 1000);
        await redis.expire(key, expiry);
      } catch {
        // Redis is optional — continue without it
      }
    }

    // Log for detailed tracking
    await prisma.aIOperationLog.create({
      data: {
        userId,
        operationType: operationType as never,
        cost,
        aiProvider: metadata?.aiProvider,
        modelUsed: metadata?.modelUsed,
        tokensUsed: metadata?.tokensUsed,
        responseTime: metadata?.responseTime,
        costUSD: metadata?.costUSD,
        inputTokens: metadata?.inputTokens,
        outputTokens: metadata?.outputTokens,
        success: true,
      },
    });
  }

  /**
   * Log a failed AI operation (no credits charged).
   */
  async logFailedOperation(
    userId: string,
    operationType: OperationType,
    errorMessage: string,
    metadata?: { aiProvider?: string; modelUsed?: string }
  ): Promise<void> {
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) return;

    await prisma.aIOperationLog.create({
      data: {
        userId,
        operationType: operationType as never,
        cost: 0,
        aiProvider: metadata?.aiProvider,
        modelUsed: metadata?.modelUsed,
        costUSD: 0,
        success: false,
        errorMessage,
      },
    });
  }

  /**
   * Get monthly usage stats for a user.
   */
  async getUsageStats(userId: string): Promise<UsageStats> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const usage = await this.getOrCreateUsage(userId, year, month);

    return {
      userId,
      year,
      month,
      operationCount: usage.operationCount,
      limit: usage.limit,
      remaining: Math.max(0, usage.limit - usage.operationCount),
      percentUsed: Math.min(100, (usage.operationCount / usage.limit) * 100),
      breakdown: {
        chatMessages: usage.chatMessages,
        textOperations: usage.textOperations,
        analysisOperations: usage.analysisOperations,
        visionOperations: usage.visionOperations,
        otherOperations: usage.otherOperations,
      },
    };
  }

  private async getOrCreateUsage(userId: string, year: number, month: number) {
    const redis = this.getRedis();

    // Try Redis cache first
    if (redis) {
      try {
        const key = REDIS_KEYS.monthlyUsage(userId, year, month);
        const cached = await redis.hgetall(key);
        if (cached && Object.keys(cached).length > 0) {
          return {
            operationCount: Number(cached.operationCount) || 0,
            limit: Number(cached.limit) || MONTHLY_LIMIT,
            chatMessages: Number(cached.chatMessages) || 0,
            textOperations: Number(cached.textOperations) || 0,
            analysisOperations: Number(cached.analysisOperations) || 0,
            visionOperations: Number(cached.visionOperations) || 0,
            otherOperations: Number(cached.otherOperations) || 0,
          };
        }
      } catch {
        // Fall through to database
      }
    }

    // Database fallback
    let usage = await prisma.aIUsage.findUnique({
      where: { userId_year_month: { userId, year, month } },
    });

    if (!usage) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!userExists) {
        return {
          operationCount: 0, limit: MONTHLY_LIMIT,
          chatMessages: 0, textOperations: 0, analysisOperations: 0, visionOperations: 0, otherOperations: 0,
        };
      }
      usage = await prisma.aIUsage.create({
        data: { userId, year, month, operationCount: 0, limit: MONTHLY_LIMIT },
      });
    }

    // Populate Redis cache
    if (redis) {
      try {
        const key = REDIS_KEYS.monthlyUsage(userId, year, month);
        await redis.hset(key, {
          operationCount: usage.operationCount,
          limit: usage.limit,
          chatMessages: usage.chatMessages,
          textOperations: usage.textOperations,
          analysisOperations: usage.analysisOperations,
          visionOperations: usage.visionOperations,
          otherOperations: usage.otherOperations,
        });
        const expiry = Math.floor((new Date(year, month + 1, 1).getTime() - Date.now()) / 1000);
        await redis.expire(key, expiry);
      } catch {
        // Redis is optional
      }
    }

    return usage;
  }

  /**
   * Admin: Get all users' usage for a given month.
   */
  async getAllUsageStats(year?: number, month?: number) {
    const now = new Date();
    return prisma.aIUsage.findMany({
      where: { year: year || now.getFullYear(), month: month || now.getMonth() + 1 },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { operationCount: 'desc' },
    });
  }

  /**
   * Admin: Get operation logs with optional filters.
   */
  async getOperationLogs(options?: {
    userId?: string;
    operationType?: string;
    provider?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const { userId, operationType, provider, startDate, endDate, limit = 100, offset = 0 } = options || {};

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (operationType) where.operationType = operationType;
    if (provider) where.aiProvider = provider;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.aIOperationLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.aIOperationLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Admin: Update a user's monthly limit.
   */
  async updateUserLimit(userId: string, newLimit: number): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    await prisma.aIUsage.upsert({
      where: { userId_year_month: { userId, year, month } },
      update: { limit: newLimit },
      create: { userId, year, month, operationCount: 0, limit: newLimit },
    });
  }
}

export const rateLimitService = new RateLimitService();

/**
 * src/lib/notifications/execute-rule.ts
 * NAWASENA M15 — Execute a notification rule for all target users in an org.
 *
 * Handles: audience resolution, chunking (50 users per batch),
 * idempotency via executionToken, NotificationRuleExecution tracking.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { sendNotification } from './send';
import { resolveAudience } from './audience/resolver';
import type { NotificationCategory } from '@prisma/client';
import { randomUUID } from 'crypto';

const log = createLogger('notifications:execute-rule');

const CHUNK_SIZE = 50;

interface ExecuteRuleParams {
  ruleId: string;
  organizationId: string;
  triggerSource: string; // 'CRON' or 'MANUAL:{userId}'
  executionToken?: string; // for idempotency on retry
}

interface ExecuteRuleResult {
  executionId: string;
  organizationId: string;
  usersTargeted: number;
  usersSent: number;
  usersFailed: number;
  usersEscalated: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}

/**
 * Execute a notification rule for a single organization.
 */
export async function executeRule(params: ExecuteRuleParams): Promise<ExecuteRuleResult> {
  const { ruleId, organizationId, triggerSource } = params;
  const executionToken = params.executionToken ?? randomUUID();

  const execLog = log.child({ ruleId, organizationId, triggerSource, executionToken });
  execLog.info('Starting rule execution');

  // Check idempotency — if execution with this token exists, skip
  const existingExecution = await prisma.notificationRuleExecution.findUnique({
    where: { executionToken },
  });

  if (existingExecution && existingExecution.status !== 'RUNNING') {
    execLog.info('Idempotency check — execution already completed', {
      status: existingExecution.status,
    });
    return {
      executionId: existingExecution.id,
      organizationId,
      usersTargeted: existingExecution.usersTargeted,
      usersSent: existingExecution.usersSent,
      usersFailed: existingExecution.usersFailed,
      usersEscalated: existingExecution.usersEscalated,
      status: existingExecution.status as 'SUCCESS' | 'PARTIAL' | 'FAILED',
    };
  }

  // Fetch rule
  const rule = await prisma.notificationRule.findUnique({
    where: { id: ruleId },
    select: {
      id: true,
      name: true,
      templateKey: true,
      category: true,
      channels: true,
      audienceResolverKey: true,
      audienceParams: true,
      active: true,
    },
  });

  if (!rule || !rule.active) {
    execLog.warn('Rule not found or inactive — skipping execution');
    return {
      executionId: 'SKIPPED',
      organizationId,
      usersTargeted: 0,
      usersSent: 0,
      usersFailed: 0,
      usersEscalated: 0,
      status: 'FAILED',
    };
  }

  // Create execution record
  const execution = await prisma.notificationRuleExecution.create({
    data: {
      ruleId,
      organizationId,
      startedAt: new Date(),
      status: 'RUNNING',
      executionToken,
      triggeredBy: triggerSource,
    },
  });

  execLog.info('Execution record created', { executionId: execution.id });

  let usersTargeted = 0;
  let usersSent = 0;
  let usersFailed = 0;
  let usersEscalated = 0;
  let errorMessage: string | undefined;

  try {
    // Resolve audience
    const audience = await resolveAudience(
      rule.audienceResolverKey,
      organizationId,
      rule.audienceParams as Record<string, unknown> | null,
    );

    usersTargeted = audience.length;
    execLog.info('Audience resolved', { count: usersTargeted });

    // Chunk audience and send in batches
    for (let i = 0; i < audience.length; i += CHUNK_SIZE) {
      const chunk = audience.slice(i, i + CHUNK_SIZE);
      execLog.debug('Processing chunk', {
        chunkIndex: Math.floor(i / CHUNK_SIZE) + 1,
        chunkSize: chunk.length,
      });

      const results = await Promise.allSettled(
        chunk.map(async (user) => {
          // Idempotency check at log level — skip if already sent for this execution
          const existingLog = await prisma.notificationLog.findFirst({
            where: {
              ruleExecutionId: execution.id,
              userId: user.id,
              status: { in: ['SENT', 'DELIVERED'] },
            },
          });

          if (existingLog) {
            execLog.debug('Skipping — already sent for this execution', {
              userId: user.id,
            });
            return { skipped: true };
          }

          return sendNotification({
            userId: user.id,
            templateKey: rule.templateKey,
            payload: {
              userName: user.fullName ?? user.name ?? 'Pengguna',
              ...(rule.audienceParams as Record<string, unknown> ?? {}),
            },
            category: rule.category as NotificationCategory,
            ruleId: rule.id,
            ruleExecutionId: execution.id,
          });
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const r = result.value;
          if ('skipped' in r && r.skipped) continue;

          const notifResult = r as Awaited<ReturnType<typeof sendNotification>>;
          if (notifResult.escalated) {
            usersEscalated++;
          } else if (notifResult.skipped) {
            // Skipped (opted out, rate limited, etc.) — counts as "failed" in execution stats
            usersFailed++;
          } else {
            const anySent = notifResult.results.some(
              (r) => r.status === 'SENT' || r.status === 'PARTIAL',
            );
            if (anySent) {
              usersSent++;
            } else {
              usersFailed++;
            }
          }
        } else {
          usersFailed++;
          execLog.error('Send failed for user in chunk', { reason: result.reason });
        }
      }
    }

    // Update rule lastExecutedAt
    await prisma.notificationRule.update({
      where: { id: ruleId },
      data: { lastExecutedAt: new Date() },
    });
  } catch (err) {
    errorMessage = (err as Error).message;
    execLog.error('Rule execution failed', { error: err });
  }

  // Determine final status
  let finalStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  if (usersFailed === 0 && usersTargeted > 0) {
    finalStatus = 'SUCCESS';
  } else if (usersSent > 0) {
    finalStatus = 'PARTIAL';
  } else {
    finalStatus = 'FAILED';
  }

  // Update execution record
  await prisma.notificationRuleExecution.update({
    where: { id: execution.id },
    data: {
      completedAt: new Date(),
      status: finalStatus,
      usersTargeted,
      usersSent,
      usersFailed,
      usersEscalated,
      errorMessage,
    },
  });

  execLog.info('Rule execution complete', {
    executionId: execution.id,
    status: finalStatus,
    usersTargeted,
    usersSent,
    usersFailed,
    usersEscalated,
  });

  return {
    executionId: execution.id,
    organizationId,
    usersTargeted,
    usersSent,
    usersFailed,
    usersEscalated,
    status: finalStatus,
  };
}

/**
 * Execute a rule across all active organizations.
 * Used by cron endpoints that run global rules.
 */
export async function executeRuleForAllOrgs(
  resolverKey: string,
  triggerSource: string,
): Promise<ExecuteRuleResult[]> {
  log.info('Executing rule for all active organizations', { resolverKey });

  // Find the global rule for this resolver key
  const rule = await prisma.notificationRule.findFirst({
    where: {
      audienceResolverKey: resolverKey,
      active: true,
      OR: [{ isGlobal: true }, { organizationId: null }],
    },
    select: { id: true, name: true },
  });

  if (!rule) {
    log.warn('No active global rule found for resolver key', { resolverKey });
    return [];
  }

  // Get all active organizations
  const organizations = await prisma.organization.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, code: true },
  });

  log.info('Found organizations for execution', {
    ruleId: rule.id,
    ruleName: rule.name,
    orgCount: organizations.length,
  });

  const results: ExecuteRuleResult[] = [];

  for (const org of organizations) {
    // Check if org has an override rule for this resolver
    const overrideRule = await prisma.notificationRule.findFirst({
      where: {
        organizationId: org.id,
        audienceResolverKey: resolverKey,
        active: true,
        overridesRuleId: rule.id,
      },
      select: { id: true },
    });

    const activeRuleId = overrideRule?.id ?? rule.id;

    try {
      const result = await executeRule({
        ruleId: activeRuleId,
        organizationId: org.id,
        triggerSource,
        executionToken: `${triggerSource}-${org.id}-${rule.id}-${new Date().toISOString().slice(0, 10)}`,
      });
      results.push(result);
    } catch (err) {
      log.error('Rule execution failed for org', { orgId: org.id, orgCode: org.code, error: err });
    }
  }

  return results;
}

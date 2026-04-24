/**
 * src/app/api/cron/daily-scan/route.ts
 * NAWASENA M15 — Cron: R07/R08 Daily Scan (dynamic-date rules)
 *
 * Schedule (UTC): 0 1 * * * (08:00 WIB daily)
 * Runs dynamic-date rules that depend on "N days before event":
 *   - R07: OC setup H-7 (notify OC 7 days before event deadline)
 *   - R08: SC triwulan signoff H-7 (notify SC 7 days before triwulan)
 *   - Cleanup: mark expired push subscriptions
 *
 * Vercel Cron sets Authorization: Bearer ${CRON_SECRET} automatically.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { executeRuleForAllOrgs } from '@/lib/notifications/execute-rule';

export const GET = createApiHandler({
  auth: false,
  handler: async (req, { log }) => {
    verifyCronAuth(req);

    log.info('Cron: daily-scan started');

    // Run R07: OC Setup H-7
    const ocResults = await executeRuleForAllOrgs('oc-setup-h7', 'CRON');

    // Run R08: SC Triwulan H-7
    const scResults = await executeRuleForAllOrgs('sc-triwulan-h7', 'CRON');

    // Subscription cleanup: remove EXPIRED subscriptions older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cleanupResult = await prisma.notificationSubscription.deleteMany({
      where: {
        status: 'EXPIRED',
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    log.info('Cron: daily-scan subscription cleanup', {
      deletedSubscriptions: cleanupResult.count,
    });

    const allResults = [...ocResults, ...scResults];
    const totalUsersSent = allResults.reduce((sum, r) => sum + r.usersSent, 0);
    const totalUsersTargeted = allResults.reduce((sum, r) => sum + r.usersTargeted, 0);
    const executionsCount = allResults.length;

    log.info('Cron: daily-scan complete', {
      executionsCount,
      totalUsersTargeted,
      totalUsersSent,
      cleanedSubscriptions: cleanupResult.count,
    });

    return ApiResponse.success({
      executionsCount,
      totalUsersTargeted,
      totalUsersSent,
      cleanedSubscriptions: cleanupResult.count,
      results: allResults.map((r) => ({
        organizationId: r.organizationId,
        status: r.status,
        usersTargeted: r.usersTargeted,
        usersSent: r.usersSent,
        usersFailed: r.usersFailed,
        usersEscalated: r.usersEscalated,
      })),
    });
  },
});

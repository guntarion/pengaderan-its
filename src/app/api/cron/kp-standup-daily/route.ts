/**
 * src/app/api/cron/kp-standup-daily/route.ts
 * NAWASENA M15 — Cron: R04 KP Stand-up Daily Reminder
 *
 * Schedule (UTC): 0 10 * * 1-5 (17:00 WIB on weekdays Monday-Friday)
 * Audience: All active KP in active cohort across all organizations.
 * Template: KP_STANDUP_DAILY
 * Category: FORM_REMINDER
 *
 * Vercel Cron sets Authorization: Bearer ${CRON_SECRET} automatically.
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { executeRuleForAllOrgs } from '@/lib/notifications/execute-rule';

export const GET = createApiHandler({
  auth: false,
  handler: async (req, { log }) => {
    verifyCronAuth(req);

    log.info('Cron: kp-standup-daily started');

    const results = await executeRuleForAllOrgs('kp-standup-daily', 'CRON');

    const totalUsersSent = results.reduce((sum, r) => sum + r.usersSent, 0);
    const totalUsersTargeted = results.reduce((sum, r) => sum + r.usersTargeted, 0);
    const executionsCount = results.length;

    log.info('Cron: kp-standup-daily complete', {
      executionsCount,
      totalUsersTargeted,
      totalUsersSent,
    });

    return ApiResponse.success({
      executionsCount,
      totalUsersTargeted,
      totalUsersSent,
      results: results.map((r) => ({
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

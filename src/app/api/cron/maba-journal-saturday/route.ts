/**
 * src/app/api/cron/maba-journal-saturday/route.ts
 * NAWASENA M15 — Cron: R02 Maba Weekly Journal Reminder (Saturday)
 *
 * Schedule (UTC): 0 10 * * 6 (17:00 WIB on Saturdays)
 * Audience: All active Maba in active cohort across all organizations.
 * Template: MABA_JOURNAL_WEEKLY
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

    log.info('Cron: maba-journal-saturday started');

    const results = await executeRuleForAllOrgs('maba-journal-weekly', 'CRON');

    const totalUsersSent = results.reduce((sum, r) => sum + r.usersSent, 0);
    const totalUsersTargeted = results.reduce((sum, r) => sum + r.usersTargeted, 0);
    const executionsCount = results.length;

    log.info('Cron: maba-journal-saturday complete', {
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

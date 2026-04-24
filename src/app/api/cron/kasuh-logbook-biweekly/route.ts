/**
 * src/app/api/cron/kasuh-logbook-biweekly/route.ts
 * NAWASENA M15 — Cron: R06 Kasuh Logbook Biweekly Reminder
 *
 * Schedule (UTC): 0 3 * * 6 (10:00 WIB on Saturdays, biweekly)
 * Note: Vercel Cron fires every Saturday; the executeRule idempotency token
 * (date-based) prevents duplicate sends within the same week. For true biweekly
 * filtering, the audience resolver can be updated to check last submission date.
 *
 * Audience: All active KASUH in active cohort across all organizations.
 * Template: KASUH_LOGBOOK_BIWEEKLY
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

    log.info('Cron: kasuh-logbook-biweekly started');

    const results = await executeRuleForAllOrgs('kasuh-logbook-biweekly', 'CRON');

    const totalUsersSent = results.reduce((sum, r) => sum + r.usersSent, 0);
    const totalUsersTargeted = results.reduce((sum, r) => sum + r.usersTargeted, 0);
    const executionsCount = results.length;

    log.info('Cron: kasuh-logbook-biweekly complete', {
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

/**
 * /admin/notifications — Redirect to /admin/notifications/rules
 */

import { redirect } from 'next/navigation';

export default function NotificationsAdminIndexPage() {
  redirect('/admin/notifications/rules');
}

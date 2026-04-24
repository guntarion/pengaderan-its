'use client';

/**
 * /settings/notifications — User notification preferences
 * All authenticated users
 */

import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { UserPreferenceForm } from '@/components/notifications/UserPreferenceForm';

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/" />

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Preferensi Notifikasi
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Atur bagaimana dan kapan Anda menerima notifikasi dari NAWASENA
        </p>
      </div>

      <UserPreferenceForm />
    </div>
  );
}

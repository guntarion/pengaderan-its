'use client';

/**
 * /admin/notifications — Layout with tab navigation
 * Roles: SC, SUPERADMIN
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Bell, FileText, List } from 'lucide-react';

const tabs = [
  {
    label: 'Aturan',
    href: '/admin/notifications/rules',
    icon: Bell,
    description: 'Kelola aturan notifikasi dan jadwal cron',
  },
  {
    label: 'Template',
    href: '/admin/notifications/templates',
    icon: FileText,
    description: 'Kelola konten template notifikasi',
  },
  {
    label: 'Log Pengiriman',
    href: '/admin/notifications/logs',
    icon: List,
    description: 'Riwayat pengiriman notifikasi',
  },
];

export default function NotificationsAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="border-b border-sky-100 dark:border-sky-900">
        <nav className="flex gap-1" aria-label="Notification admin tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-sky-500 text-sky-700 dark:text-sky-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {children}
    </div>
  );
}

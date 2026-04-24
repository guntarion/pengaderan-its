// src/components/layout/vertical/sidebar/Sidebaritems.ts
import { uniqueId } from 'lodash';

export interface ChildItem {
  id?: number | string;
  name?: string;
  icon?: string;
  children?: ChildItem[];
  url?: string;
  color?: string;
  isPro?: boolean;
  roles?: string[];
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: string;
  id?: number;
  to?: string;
  items?: MenuItem[];
  children?: ChildItem[];
  url?: string;
  isPro?: boolean;
  roles?: string[];
}

/**
 * NAWASENA sidebar menu items.
 * Role-based access via the `roles` array on each item.
 * The RoleAwareNavItem component filters items based on user.role.
 *
 * NAWASENA roles: MABA, KP, KASUH, OC, ELDER, SC, PEMBINA, BLM, SATGAS, ALUMNI, DOSEN_WALI, SUPERADMIN
 */

// Shorthand role groups
const ALL_NAWASENA = ['MABA', 'KP', 'KASUH', 'OC', 'ELDER', 'SC', 'PEMBINA', 'BLM', 'SATGAS', 'ALUMNI', 'DOSEN_WALI', 'SUPERADMIN'];
const COMMITTEE = ['KP', 'KASUH', 'OC', 'ELDER', 'SC', 'PEMBINA', 'BLM', 'SATGAS', 'SUPERADMIN'];
const SENIOR_STAFF = ['SC', 'PEMBINA', 'BLM', 'SATGAS', 'SUPERADMIN'];
const ADMIN_ROLES = ['SC', 'SUPERADMIN'];
const SUPERADMIN_ONLY = ['SUPERADMIN'];

const SidebarContent: MenuItem[] = [
  /* ----------------------------------------------------------------- */
  /* UMUM — Semua pengguna                                               */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Umum',
    roles: ALL_NAWASENA,
    children: [
      {
        name: 'Dashboard',
        icon: 'solar:widget-add-line-duotone',
        id: uniqueId(),
        url: '/',
        isPro: false,
        roles: ALL_NAWASENA,
      },
      {
        name: 'Profil Saya',
        icon: 'solar:user-circle-linear',
        id: uniqueId(),
        url: '/profile',
        isPro: false,
        roles: ALL_NAWASENA,
      },
      {
        name: 'Preferensi Notifikasi',
        icon: 'solar:bell-linear',
        id: uniqueId(),
        url: '/settings/notifications',
        isPro: false,
        roles: ALL_NAWASENA,
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* PAKTA — Proses penandatanganan komitmen                             */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Pakta & Komitmen',
    roles: ALL_NAWASENA,
    children: [
      {
        name: 'Tandatangani Pakta',
        icon: 'solar:pen-new-square-line-duotone',
        id: uniqueId(),
        isPro: false,
        roles: ALL_NAWASENA,
        children: [
          {
            id: uniqueId(),
            name: 'Pakta Panitia',
            url: '/pakta/sign/PAKTA_PANITIA',
            isPro: false,
            roles: COMMITTEE,
          },
          {
            id: uniqueId(),
            name: 'Social Contract',
            url: '/pakta/sign/SOCIAL_CONTRACT_MABA',
            isPro: false,
            roles: ['MABA', ...COMMITTEE],
          },
          {
            id: uniqueId(),
            name: 'Pakta Pengader 2027',
            url: '/pakta/sign/PAKTA_PENGADER_2027',
            isPro: false,
            roles: COMMITTEE,
          },
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* REFERENSI — Panduan & Dokumen Master                               */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Referensi',
    roles: ALL_NAWASENA,
    children: [
      {
        name: 'Referensi',
        icon: 'solar:book-bookmark-minimalistic-linear',
        id: uniqueId(),
        isPro: false,
        roles: ALL_NAWASENA,
        children: [
          {
            id: uniqueId(),
            name: 'Katalog Kegiatan',
            url: '/kegiatan',
            isPro: false,
            roles: ALL_NAWASENA,
          },
          {
            id: uniqueId(),
            name: 'Forbidden Acts',
            url: '/referensi/forbidden-acts',
            isPro: false,
            roles: ALL_NAWASENA,
          },
          {
            id: uniqueId(),
            name: 'Safeguard Protocol',
            url: '/referensi/safeguard',
            isPro: false,
            roles: ALL_NAWASENA,
          },
          {
            id: uniqueId(),
            name: 'Rubrik AAC&U',
            url: '/referensi/rubrik',
            isPro: false,
            roles: ALL_NAWASENA,
          },
          {
            id: uniqueId(),
            name: 'Taksonomi',
            url: '/referensi/taksonomi',
            isPro: false,
            roles: ALL_NAWASENA,
          },
          {
            id: uniqueId(),
            name: 'Inventori Form',
            url: '/referensi/form-inventory',
            isPro: false,
            roles: COMMITTEE,
          },
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* ADMIN — Manajemen organisasi (SC, PEMBINA, BLM, SATGAS, SUPERADMIN) */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Administrasi',
    roles: SENIOR_STAFF,
    children: [
      {
        name: 'Pengguna',
        icon: 'solar:users-group-rounded-linear',
        id: uniqueId(),
        isPro: false,
        roles: SENIOR_STAFF,
        children: [
          {
            id: uniqueId(),
            name: 'Daftar Pengguna',
            url: '/admin/users',
            isPro: false,
            roles: SENIOR_STAFF,
          },
          {
            id: uniqueId(),
            name: 'Import CSV',
            url: '/admin/users/bulk-import',
            isPro: false,
            roles: ADMIN_ROLES,
          },
          {
            id: uniqueId(),
            name: 'Whitelist Email',
            url: '/admin/whitelist',
            isPro: false,
            roles: SENIOR_STAFF,
          },
        ],
      },
      {
        name: 'Kohort',
        icon: 'solar:users-group-two-rounded-linear',
        id: uniqueId(),
        isPro: false,
        roles: SENIOR_STAFF,
        children: [
          {
            id: uniqueId(),
            name: 'Daftar Kohort',
            url: '/admin/cohorts',
            isPro: false,
            roles: SENIOR_STAFF,
          },
          {
            id: uniqueId(),
            name: 'Tambah Kohort',
            url: '/admin/cohorts/new',
            isPro: false,
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        name: 'Pakta & Dokumen',
        icon: 'solar:document-text-linear',
        id: uniqueId(),
        isPro: false,
        roles: SENIOR_STAFF,
        children: [
          {
            id: uniqueId(),
            name: 'Versi Pakta',
            url: '/admin/pakta',
            isPro: false,
            roles: SENIOR_STAFF,
          },
          {
            id: uniqueId(),
            name: 'Terbitkan Versi Baru',
            url: '/admin/pakta/new',
            isPro: false,
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        name: 'Notifikasi',
        icon: 'solar:bell-bing-linear',
        id: uniqueId(),
        isPro: false,
        roles: ADMIN_ROLES,
        children: [
          {
            id: uniqueId(),
            name: 'Aturan Notifikasi',
            url: '/admin/notifications/rules',
            isPro: false,
            roles: ADMIN_ROLES,
          },
          {
            id: uniqueId(),
            name: 'Template',
            url: '/admin/notifications/templates',
            isPro: false,
            roles: ADMIN_ROLES,
          },
          {
            id: uniqueId(),
            name: 'Log Pengiriman',
            url: '/admin/notifications/logs',
            isPro: false,
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        name: 'Audit Log',
        icon: 'solar:clipboard-list-linear',
        id: uniqueId(),
        url: '/admin/audit-log',
        isPro: false,
        roles: SENIOR_STAFF,
      },
      {
        name: 'Master Data',
        icon: 'solar:database-linear',
        id: uniqueId(),
        isPro: false,
        roles: ADMIN_ROLES,
        children: [
          {
            id: uniqueId(),
            name: 'Hub Master Data',
            url: '/admin/master',
            isPro: false,
            roles: ADMIN_ROLES,
          },
          {
            id: uniqueId(),
            name: 'Kegiatan',
            url: '/admin/master/kegiatan',
            isPro: false,
            roles: ADMIN_ROLES,
          },
          {
            id: uniqueId(),
            name: 'Taksonomi',
            url: '/admin/master/taksonomi',
            isPro: false,
            roles: SUPERADMIN_ONLY,
          },
          {
            id: uniqueId(),
            name: 'Seed Data',
            url: '/admin/master/seed',
            isPro: false,
            roles: SUPERADMIN_ONLY,
          },
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* RELASI & PENDAMPINGAN — Dashboard per peran (MABA, KP, KASUH)     */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Relasi & Pendampingan',
    roles: ['MABA', 'KP', 'KASUH'],
    children: [
      {
        name: 'Relasi Saya',
        icon: 'solar:heart-angle-linear',
        id: uniqueId(),
        url: '/dashboard/relasi',
        isPro: false,
        roles: ['MABA'],
      },
      {
        name: 'Ajukan Pergantian Kasuh',
        icon: 'solar:clipboard-list-linear',
        id: uniqueId(),
        url: '/dashboard/kakak-c/request',
        isPro: false,
        roles: ['MABA'],
      },
      {
        name: 'Grup Saya',
        icon: 'solar:users-group-rounded-linear',
        id: uniqueId(),
        url: '/dashboard/kp/group',
        isPro: false,
        roles: ['KP'],
      },
      {
        name: 'Adik Asuh',
        icon: 'solar:heart-angle-linear',
        id: uniqueId(),
        url: '/dashboard/kasuh/adik-asuh',
        isPro: false,
        roles: ['KASUH'],
      },
      {
        name: 'Adik Asuh Saya',
        icon: 'solar:notebook-bookmark-linear',
        id: uniqueId(),
        url: '/dashboard/kasuh',
        isPro: false,
        roles: ['KASUH'],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* PULSE & JURNAL — M04 Maba daily pulse + weekly journal             */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Pulse & Jurnal',
    roles: ['MABA'],
    children: [
      {
        name: 'Pulse Harian',
        icon: 'solar:heart-pulse-linear',
        id: uniqueId(),
        url: '/dashboard/pulse',
        isPro: false,
        roles: ['MABA'],
      },
      {
        name: 'Jurnal Mingguan',
        icon: 'solar:notebook-linear',
        id: uniqueId(),
        url: '/dashboard/journal',
        isPro: false,
        roles: ['MABA'],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* KP TOOLS — M04 mood dashboard + journal scoring + M09 logbook     */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Alat KP',
    roles: ['KP'],
    children: [
      {
        name: 'Nilai Jurnal',
        icon: 'solar:clipboard-check-linear',
        id: uniqueId(),
        url: '/dashboard/kp/journal-review',
        isPro: false,
        roles: ['KP'],
      },
      {
        name: 'Mood Kelompok',
        icon: 'solar:chart-line-duotone',
        id: uniqueId(),
        url: '/dashboard/kp/mood',
        isPro: false,
        roles: ['KP'],
      },
      {
        name: 'Log Daily',
        icon: 'solar:checklist-minimalistic-line-duotone',
        id: uniqueId(),
        url: '/dashboard/kp/log/daily',
        isPro: false,
        roles: ['KP'],
      },
      {
        name: 'Weekly Debrief',
        icon: 'solar:notebook-linear',
        id: uniqueId(),
        url: '/dashboard/kp/log/weekly',
        isPro: false,
        roles: ['KP'],
      },
      {
        name: 'Peer Debriefs',
        icon: 'solar:users-group-rounded-linear',
        id: uniqueId(),
        url: '/dashboard/kp/peer-debriefs',
        isPro: false,
        roles: ['KP'],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* STRUKTUR ANGKATAN — KP Group, Buddy, Kasuh, Pairing (SC/OC)       */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Struktur Angkatan',
    roles: ['SC', 'OC', 'SUPERADMIN'],
    children: [
      {
        name: 'Struktur',
        icon: 'solar:network-linear',
        id: uniqueId(),
        isPro: false,
        roles: ['SC', 'OC', 'SUPERADMIN'],
        children: [
          {
            id: uniqueId(),
            name: 'KP Group',
            url: '/admin/struktur/kp-group',
            isPro: false,
            roles: ['SC', 'OC', 'SUPERADMIN'],
          },
          {
            id: uniqueId(),
            name: 'Buddy Pairing',
            url: '/admin/struktur/buddy-pairing',
            isPro: false,
            roles: ['SC', 'OC', 'SUPERADMIN'],
          },
          {
            id: uniqueId(),
            name: 'Kasuh Pairing',
            url: '/admin/struktur/kasuh-pairing',
            isPro: false,
            roles: ['SC', 'SUPERADMIN'],
          },
          {
            id: uniqueId(),
            name: 'Pairing Requests',
            url: '/admin/struktur/pairing-requests',
            isPro: false,
            roles: ['SC', 'SUPERADMIN'],
          },
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* PASSPORT DIGITAL — M05                                              */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Passport Digital',
    roles: ALL_NAWASENA,
    children: [
      {
        name: 'Passport Saya',
        icon: 'solar:passport-linear',
        id: uniqueId(),
        url: '/dashboard/passport',
        isPro: false,
        roles: ALL_NAWASENA,
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* KEGIATAN — M06 Event Listing + RSVP + NPS                          */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Kegiatan',
    roles: ['MABA'],
    children: [
      {
        name: 'Kegiatan Saya',
        icon: 'solar:calendar-mark-linear',
        id: uniqueId(),
        url: '/dashboard/kegiatan',
        isPro: false,
        roles: ['MABA'],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* TIME CAPSULE — M07 Catatan & Refleksi Maba                         */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Time Capsule',
    roles: ['MABA'],
    children: [
      {
        name: 'Catatan Saya',
        icon: 'solar:notebook-bookmark-linear',
        id: uniqueId(),
        url: '/dashboard/time-capsule',
        isPro: false,
        roles: ['MABA'],
      },
      {
        name: 'Tulis Baru',
        icon: 'solar:pen-new-square-line-duotone',
        id: uniqueId(),
        url: '/dashboard/time-capsule/new',
        isPro: false,
        roles: ['MABA'],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* LIFE MAP — M07 Goal SMART per 6 area kehidupan                    */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Life Map',
    roles: ['MABA'],
    children: [
      {
        name: 'Peta Tujuan Hidup',
        icon: 'solar:target-linear',
        id: uniqueId(),
        url: '/dashboard/life-map',
        isPro: false,
        roles: ['MABA'],
      },
      {
        name: 'Tambah Goal',
        icon: 'solar:add-circle-linear',
        id: uniqueId(),
        url: '/dashboard/life-map/new',
        isPro: false,
        roles: ['MABA'],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* PORTFOLIO — M07 Ringkasan Perjalanan NAWASENA                      */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Portfolio',
    roles: ['MABA', 'KASUH'],
    children: [
      {
        name: 'Portfolio Saya',
        icon: 'solar:case-round-minimalistic-linear',
        id: uniqueId(),
        url: '/dashboard/portfolio',
        isPro: false,
        roles: ['MABA'],
      },
      {
        name: 'Catatan Adik Asuh',
        icon: 'solar:notebook-minimalistic-linear',
        id: uniqueId(),
        url: '/dashboard/kasuh/adik-asuh',
        isPro: false,
        roles: ['KASUH'],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* KELOLA KEGIATAN — M06/M08 OC Hub                                    */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Kelola Kegiatan',
    roles: ['OC', 'SC', 'SUPERADMIN'],
    children: [
      {
        name: 'Daftar Sesi',
        icon: 'solar:calendar-date-linear',
        id: uniqueId(),
        url: '/dashboard/oc/kegiatan',
        isPro: false,
        roles: ['OC', 'SC', 'SUPERADMIN'],
      },
      {
        name: 'Buat Sesi Baru',
        icon: 'solar:calendar-add-linear',
        id: uniqueId(),
        url: '/dashboard/oc/kegiatan/new',
        isPro: false,
        roles: ['OC', 'SC', 'SUPERADMIN'],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* KEHADIRAN MABA — M08 Scan Attendance PWA                            */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Kehadiran',
    roles: ['MABA'],
    children: [
      {
        name: 'Scan Kehadiran',
        icon: 'solar:qr-code-linear',
        id: uniqueId(),
        url: '/dashboard/attendance/scan',
        isPro: false,
        roles: ['MABA'],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* VERIFIKASI PASSPORT — Untuk verifikator                             */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Verifikasi Passport',
    roles: ['KP', 'KASUH', 'DOSEN_WALI', 'SC', 'SUPERADMIN'],
    children: [
      {
        name: 'Antrian Verifikasi',
        icon: 'solar:checklist-minimalistic-line-duotone',
        id: uniqueId(),
        url: '/dashboard/verifier/queue',
        isPro: false,
        roles: ['KP', 'KASUH', 'DOSEN_WALI', 'SC', 'SUPERADMIN'],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* ADMIN PASSPORT — SC/SUPERADMIN                                      */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Admin Passport',
    roles: ADMIN_ROLES,
    children: [
      {
        name: 'Dashboard Cohort',
        icon: 'solar:chart-2-linear',
        id: uniqueId(),
        url: '/admin/passport',
        isPro: false,
        roles: ADMIN_ROLES,
        children: [
          {
            id: uniqueId(),
            name: 'Overview Passport',
            url: '/admin/passport',
            isPro: false,
            roles: ADMIN_ROLES,
          },
          {
            id: uniqueId(),
            name: 'QR Generator',
            url: '/admin/passport/qr-generator',
            isPro: false,
            roles: ADMIN_ROLES,
          },
          {
            id: uniqueId(),
            name: 'Export SKEM',
            url: '/admin/passport/skem-export',
            isPro: false,
            roles: ADMIN_ROLES,
          },
          {
            id: uniqueId(),
            name: 'Override Entry',
            url: '/admin/passport/overrides',
            isPro: false,
            roles: ADMIN_ROLES,
          },
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  /* SUPERADMIN — Manajemen lintas-organisasi                            */
  /* ----------------------------------------------------------------- */
  {
    isPro: false,
    heading: 'Sistem',
    roles: SUPERADMIN_ONLY,
    children: [
      {
        name: 'Organisasi',
        icon: 'solar:buildings-2-linear',
        id: uniqueId(),
        isPro: false,
        roles: SUPERADMIN_ONLY,
        children: [
          {
            id: uniqueId(),
            name: 'Daftar Organisasi',
            url: '/admin/organizations',
            isPro: false,
            roles: SUPERADMIN_ONLY,
          },
          {
            id: uniqueId(),
            name: 'Tambah Organisasi',
            url: '/admin/organizations/new',
            isPro: false,
            roles: SUPERADMIN_ONLY,
          },
        ],
      },
    ],
  },
];

export default SidebarContent;

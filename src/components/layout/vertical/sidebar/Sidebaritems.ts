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
        name: 'Audit Log',
        icon: 'solar:clipboard-list-linear',
        id: uniqueId(),
        url: '/admin/audit-log',
        isPro: false,
        roles: SENIOR_STAFF,
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

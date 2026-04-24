// e2e/fixtures/struktur.ts
// Fixture helpers and test users for M03 Struktur Angkatan E2E tests.
//
// Seeds: 1 cohort, 20 MABA (10 rantau, 10 lokal), 12 KP, 8 KASUH, 1 SC, 1 OC.
// Each role has a dedicated storageState file for authenticated sessions.

import { test as base, type Page } from '@playwright/test';

const E2E_DOMAIN = '@e2e.template.local';
const E2E_PASSWORD = 'E2eTestP@ss2026!';
const AUTH_DIR = 'e2e/auth';

export interface StrukturTestUser {
  key: string;
  email: string;
  password: string;
  name: string;
  role: string;
  storageStatePath: string;
}

/**
 * Nawasena-specific test users for struktur E2E tests.
 * These users must exist in the E2E database (seeded via global-setup.ts).
 */
export const STRUKTUR_TEST_USERS = {
  sc: {
    key: 'sc',
    email: `test-sc${E2E_DOMAIN}`,
    password: E2E_PASSWORD,
    name: 'E2E SC',
    role: 'SC',
    storageStatePath: `${AUTH_DIR}/sc.json`,
  },
  oc: {
    key: 'oc',
    email: `test-oc${E2E_DOMAIN}`,
    password: E2E_PASSWORD,
    name: 'E2E OC',
    role: 'OC',
    storageStatePath: `${AUTH_DIR}/oc.json`,
  },
  kp: {
    key: 'kp',
    email: `test-kp-01${E2E_DOMAIN}`,
    password: E2E_PASSWORD,
    name: 'E2E KP 01',
    role: 'KP',
    storageStatePath: `${AUTH_DIR}/kp.json`,
  },
  kasuh: {
    key: 'kasuh',
    email: `test-kasuh-01${E2E_DOMAIN}`,
    password: E2E_PASSWORD,
    name: 'E2E Kasuh 01',
    role: 'KASUH',
    storageStatePath: `${AUTH_DIR}/kasuh.json`,
  },
  maba: {
    key: 'maba',
    email: `test-maba-01${E2E_DOMAIN}`,
    password: E2E_PASSWORD,
    name: 'E2E Maba 01',
    role: 'MABA',
    storageStatePath: `${AUTH_DIR}/maba.json`,
  },
  mabaRantau: {
    key: 'mabaRantau',
    email: `test-maba-rantau-01${E2E_DOMAIN}`,
    password: E2E_PASSWORD,
    name: 'E2E Maba Rantau 01',
    role: 'MABA',
    storageStatePath: `${AUTH_DIR}/maba-rantau.json`,
  },
} satisfies Record<string, StrukturTestUser>;

/**
 * Fixture type definitions for struktur E2E tests.
 */
type StrukturFixtures = {
  scPage: Page;
  ocPage: Page;
  kpPage: Page;
  kasuhPage: Page;
  mabaPage: Page;
};

/**
 * Extended test with pre-authenticated pages for each Nawasena role.
 */
export const test = base.extend<StrukturFixtures>({
  scPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STRUKTUR_TEST_USERS.sc.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  ocPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STRUKTUR_TEST_USERS.oc.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  kpPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STRUKTUR_TEST_USERS.kp.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  kasuhPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STRUKTUR_TEST_USERS.kasuh.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  mabaPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STRUKTUR_TEST_USERS.maba.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';

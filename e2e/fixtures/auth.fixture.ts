// e2e/fixtures/auth.fixture.ts
// Pre-authenticated page fixtures for each test user role.

import { test as base, type Page } from '@playwright/test';
import { TEST_USERS } from '../helpers/test-users';

type AuthFixtures = {
  adminPage: Page;
  memberPage: Page;
  editorPage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.admin.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  memberPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.member.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  editorPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.editor.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';

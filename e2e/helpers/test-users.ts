export interface TestUser {
  key: string;
  email: string;
  password: string;
  name: string;
  role: string;
  storageStatePath: string;
}

const E2E_DOMAIN = '@e2e.template.local';
const E2E_PASSWORD = 'E2eTestP@ss2026!';

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    key: 'admin',
    email: `test-admin${E2E_DOMAIN}`,
    password: E2E_PASSWORD,
    name: 'E2E Admin',
    role: 'admin',
    storageStatePath: 'e2e/auth/admin.json',
  },
  member: {
    key: 'member',
    email: `test-member${E2E_DOMAIN}`,
    password: E2E_PASSWORD,
    name: 'E2E Member',
    role: 'member',
    storageStatePath: 'e2e/auth/member.json',
  },
  editor: {
    key: 'editor',
    email: `test-editor${E2E_DOMAIN}`,
    password: E2E_PASSWORD,
    name: 'E2E Editor',
    role: 'editor',
    storageStatePath: 'e2e/auth/editor.json',
  },
};

export const E2E_EMAIL_DOMAIN = E2E_DOMAIN;

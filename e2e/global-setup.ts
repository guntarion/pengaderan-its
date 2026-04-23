// e2e/global-setup.ts
// Runs once before all E2E tests: creates test users and authenticates them.

import type { FullConfig } from '@playwright/test';
import { createTestUsers, seedTestData } from './helpers/prisma-helpers';
import { authenticateAllUsers } from './helpers/auth-helpers';

async function globalSetup(config: FullConfig) {
  console.log('\n=== E2E Global Setup ===\n');

  // 1. Create test users in the database
  await createTestUsers();

  // 2. Seed any additional test data
  await seedTestData();

  // 3. Authenticate all users and save storage states
  await authenticateAllUsers(config);

  console.log('\n=== E2E Global Setup Complete ===\n');
}

export default globalSetup;

// e2e/global-teardown.ts
// Runs once after all E2E tests: cleans up test data.

import { cleanupTestUsers, disconnectPrisma } from './helpers/prisma-helpers';

async function globalTeardown() {
  console.log('\n=== E2E Global Teardown ===\n');

  await cleanupTestUsers();
  await disconnectPrisma();

  console.log('\n=== E2E Global Teardown Complete ===\n');
}

export default globalTeardown;

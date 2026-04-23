import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { TEST_USERS, E2E_EMAIL_DOMAIN } from './test-users';

const prisma = new PrismaClient();

export async function createTestUsers(): Promise<void> {
  console.log('[E2E Setup] Creating test users...');

  for (const user of Object.values(TEST_USERS)) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: hashedPassword,
        role: user.role as never,
      },
      create: {
        email: user.email,
        name: user.name,
        password: hashedPassword,
        role: user.role as never,
      },
    });

    console.log(`  ✓ ${user.key} (${user.email}) — ${user.role}`);
  }

  console.log('[E2E Setup] Test users created.');
}

export async function seedTestData(): Promise<void> {
  console.log('[E2E Setup] Seeding minimal test data...');
  // Add project-specific seed data here as your schema grows.
  // Example: create test records for the member user.
  console.log('[E2E Setup] Test data seeded.');
}

export async function cleanupTestUsers(): Promise<void> {
  console.log('[E2E Teardown] Cleaning up test users...');

  const testUsers = await prisma.user.findMany({
    where: { email: { endsWith: E2E_EMAIL_DOMAIN } },
    select: { id: true, email: true },
  });

  if (testUsers.length === 0) {
    console.log('  No test users found.');
    return;
  }

  const userIds = testUsers.map((u) => u.id);

  // Delete child records (respect foreign keys)
  await prisma.aIOperationLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
  await prisma.aIUsage.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });

  // Delete the users
  const result = await prisma.user.deleteMany({
    where: { email: { endsWith: E2E_EMAIL_DOMAIN } },
  });

  console.log(`  ✓ Deleted ${result.count} test users and related data.`);
  console.log('[E2E Teardown] Cleanup complete.');
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

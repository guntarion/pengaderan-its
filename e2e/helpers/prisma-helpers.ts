import { PrismaClient, UserRole, UserStatus, OrganizationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { TEST_USERS, E2E_EMAIL_DOMAIN } from './test-users';

const prisma = new PrismaClient();

const DEFAULT_ORG_CODE = process.env.TENANT_ORG_CODE ?? 'HMTC';

async function getOrCreateTestOrg() {
  return prisma.organization.upsert({
    where: { code: DEFAULT_ORG_CODE },
    create: {
      code: DEFAULT_ORG_CODE,
      name: 'Test Organization HMTC',
      fullName: 'Himpunan Mahasiswa Teknik Komputer (Test)',
      status: OrganizationStatus.ACTIVE,
    },
    update: {},
  });
}

export async function createTestUsers(): Promise<void> {
  const org = await getOrCreateTestOrg();

  for (const user of Object.values(TEST_USERS)) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.name,
        password: hashedPassword,
        role: (user.role as UserRole) ?? UserRole.MABA,
      },
      create: {
        email: user.email,
        fullName: user.name,
        password: hashedPassword,
        role: (user.role as UserRole) ?? UserRole.MABA,
        organizationId: org.id,
        status: UserStatus.ACTIVE,
      },
    });
  }
}

export async function seedTestData(): Promise<void> {
  // Add project-specific seed data here as NAWASENA schema grows.
}

export async function cleanupTestUsers(): Promise<void> {
  const testUsers = await prisma.user.findMany({
    where: { email: { endsWith: E2E_EMAIL_DOMAIN } },
    select: { id: true, email: true },
  });

  if (testUsers.length === 0) return;

  const userIds = testUsers.map((u) => u.id);

  // Delete child records (respect foreign keys)
  await prisma.aIOperationLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
  await prisma.aIUsage.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
  await prisma.nawasenaAuditLog.deleteMany({
    where: { actorUserId: { in: userIds } },
  }).catch(() => {});
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });

  await prisma.user.deleteMany({
    where: { email: { endsWith: E2E_EMAIL_DOMAIN } },
  });
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

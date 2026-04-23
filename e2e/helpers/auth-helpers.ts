import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import { TEST_USERS, type TestUser } from './test-users';

/**
 * Authenticate a test user via NextAuth CredentialsProvider.
 * Uses CSRF token flow with retry logic.
 */
export async function authenticateUser(baseURL: string, user: TestUser): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    let authenticated = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      // Get CSRF token (also sets CSRF cookie)
      const csrfResponse = await page.request.get('/api/auth/csrf');
      const { csrfToken } = await csrfResponse.json();

      if (!csrfToken) throw new Error(`No CSRF token for ${user.email}`);

      // POST credentials
      const signInResponse = await page.request.post('/api/auth/callback/credentials', {
        form: {
          email: user.email,
          password: user.password,
          csrfToken,
          json: 'true',
        },
      });

      // Check session cookie
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(
        (c) =>
          c.name === 'next-auth.session-token' ||
          c.name === '__Secure-next-auth.session-token'
      );

      if (sessionCookie) {
        authenticated = true;
        break;
      }

      // Try navigating to establish session
      if (signInResponse.ok() || signInResponse.status() === 302) {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const retryCheck = await context.cookies();
        if (retryCheck.find((c) => c.name.includes('session-token'))) {
          authenticated = true;
          break;
        }
      }

      if (attempt < 3) {
        console.log(`  ⟳ Auth attempt ${attempt} failed for ${user.email}, retrying...`);
        await context.clearCookies();
        await page.goto('/auth/login');
        await page.waitForLoadState('domcontentloaded');
      }
    }

    if (!authenticated) throw new Error(`Auth failed for ${user.email} after 3 attempts`);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const storageStatePath = path.resolve(process.cwd(), user.storageStatePath);
    await context.storageState({ path: storageStatePath });

    console.log(`  ✓ Authenticated ${user.key} (${user.email}) -> ${user.storageStatePath}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * Authenticate all test users and save storage states.
 */
export async function authenticateAllUsers(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use?.baseURL || process.env.E2E_BASE_URL || 'http://localhost:3000';

  console.log('[E2E Setup] Authenticating test users...');

  for (const user of Object.values(TEST_USERS)) {
    await authenticateUser(baseURL, user);
  }

  console.log('[E2E Setup] All users authenticated.');
}

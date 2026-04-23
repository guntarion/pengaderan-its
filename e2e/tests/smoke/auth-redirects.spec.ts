// e2e/tests/smoke/auth-redirects.spec.ts
// Tests that protected routes redirect unauthenticated users.

import { test, expect } from '@playwright/test';

test.describe('Auth Redirects', () => {
  test('unauthenticated user is redirected from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Should redirect to login page or show auth challenge
    const url = page.url();
    const isRedirected = url.includes('/auth/login') || url.includes('/api/auth/signin');
    const hasLoginForm = await page.locator('input[type="email"], input[type="password"]').count();

    expect(isRedirected || hasLoginForm > 0).toBeTruthy();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.goto('/auth/login');
    expect(response?.status()).toBeLessThan(500);
  });

  test('NextAuth session endpoint responds', async ({ page }) => {
    await page.goto('/');
    const response = await page.request.get('/api/auth/session');
    expect(response.status()).toBe(200);

    const session = await response.json();
    // Unauthenticated: session should be empty or have no user
    expect(session.user).toBeUndefined();
  });
});

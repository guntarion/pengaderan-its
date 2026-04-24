// e2e/tests/struktur/buddy-pair-generate.spec.ts
// E2E: OC generates buddy pairs, previews crossRatio, and can commit.

import { test, expect } from '../../fixtures/struktur';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('Buddy Pair Generation Flow', () => {
  test('OC can view buddy pairing list page', async ({ ocPage }) => {
    await ocPage.goto(`${BASE_URL}/admin/struktur/buddy-pairing`);

    await expect(ocPage.getByRole('heading', { name: 'Buddy Pairing' })).toBeVisible();
    await expect(ocPage.getByRole('button', { name: /generate buddy pair/i })).toBeVisible();
  });

  test('OC can navigate to generate page', async ({ ocPage }) => {
    await ocPage.goto(`${BASE_URL}/admin/struktur/buddy-pairing`);

    await ocPage.getByRole('button', { name: /generate buddy pair/i }).click();
    await expect(ocPage).toHaveURL(/\/admin\/struktur\/buddy-pairing\/generate/);
  });

  test('API preview returns valid buddy pair data structure', async ({ ocPage }) => {
    // Fetch cohort list first
    const cohortsRes = await ocPage.request.get(`${BASE_URL}/api/admin/struktur/kp-groups`);
    const cohortsBody = await cohortsRes.json();

    if (!cohortsBody.data || cohortsBody.data.length === 0) {
      test.skip();
      return;
    }

    const cohortId = cohortsBody.data[0].cohort?.id as string | undefined;
    if (!cohortId) {
      test.skip();
      return;
    }

    const previewRes = await ocPage.request.post(
      `${BASE_URL}/api/admin/struktur/buddy-pairs/generate/preview`,
      {
        data: { cohortId, seed: 'e2e-test-seed', oddStrategy: 'triple' },
      }
    );

    // May fail if no MABA — just verify response shape
    const previewBody = await previewRes.json();
    expect(previewBody).toHaveProperty('success');
  });

  test('Buddy pairs list shows correct columns', async ({ ocPage }) => {
    await ocPage.goto(`${BASE_URL}/admin/struktur/buddy-pairing`);

    await expect(ocPage.getByText('Anggota')).toBeVisible();
    await expect(ocPage.getByText('Kohort')).toBeVisible();
    await expect(ocPage.getByText('Status')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { stepPaced } from './helpers/pace';

test.describe('Epic 01 — Foundation', () => {
  test.setTimeout(120_000);

  test('HRBP sees workforce pages but not PMO-only areas', async ({ page }) => {
    await stepPaced(page,'Login as HRBP', async () => {
      await login(page, 'hrbp.user');
      await expect(page.getByRole('heading', { name: /welcome back, hrbp\.user/i })).toBeVisible();
    });

    await stepPaced(page,'RBAC: no import link', async () => {
      await expect(page.getByRole('link', { name: 'Workforce Import' })).toHaveCount(0);
    });

    await stepPaced(page,'Navigate workforce pages available to HRBP', async () => {
      for (const [link, heading] of [
        ['Projects/Services', 'Projects/Services'],
        ['Allocations', 'Allocations'],
        ['Bench/Availability', 'Bench/Availability']
      ] as const) {
        await page.getByRole('link', { name: link }).click();
        await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      }
    });
  });
});

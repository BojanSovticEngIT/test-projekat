import { test, expect } from '@playwright/test';
import { login, relogin } from './helpers/auth';
import { stepPaced } from './helpers/pace';

test.describe('Module 01 — Regression (browser)', () => {
  test.setTimeout(180_000);

  test('M1 pages load and core self-service actions work per role', async ({ page }) => {
    await stepPaced(page,'Employee uses My Skills self-service', async () => {
      await login(page, 'employee');
      await page.getByRole('link', { name: 'My Skills' }).click();
      await expect(page.getByRole('heading', { name: 'My Skills' })).toBeVisible();
      await page.getByRole('button', { name: 'Add Skill' }).click();

      await expect(page.getByRole('heading', { name: 'Add Skill' })).toBeVisible();
      await page.getByLabel('Search skills').fill('Java');
      await expect(page.getByRole('button', { name: /^Java\b/ })).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('heading', { name: 'My Skills' })).toBeVisible();
    });

    await stepPaced(page,'Manager opens Validation Requests', async () => {
      await relogin(page, 'manager');
      await page.getByRole('link', { name: 'Validation Requests' }).click();
      await expect(page.getByRole('heading', { name: 'Validation Requests' })).toBeVisible();
      await expect(page.getByLabel('Search')).toBeVisible();
    });

    await stepPaced(page,'Admin opens Skill Catalog', async () => {
      await relogin(page, 'admin');
      await page.getByRole('link', { name: 'Skills', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Skill Catalog' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Skill' })).toBeVisible();
    });

    await stepPaced(page,'HR searches Employees', async () => {
      await relogin(page, 'hr');
      await page.getByRole('link', { name: 'Employees' }).click();
      await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
      await page.getByLabel('Name or email').fill('EMP003');
      await expect(page.getByRole('cell', { name: /Employee One/i })).toBeVisible();
    });
  });
});

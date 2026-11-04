import { expect, type Page } from '@playwright/test';
import { pace } from './pace';

export const PASSWORD = 'password';

export async function login(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await pace(page);
}

export async function logout(page: Page): Promise<void> {
  await page.locator('[data-testid="LogoutOutlinedIcon"]').click();
  await expect(page).toHaveURL(/\/login$/);
}

export async function relogin(page: Page, username: string): Promise<void> {
  await logout(page);
  await login(page, username);
  await pace(page);
}

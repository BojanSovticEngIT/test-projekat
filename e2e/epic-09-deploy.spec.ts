import { test, expect } from '@playwright/test';
import { login, relogin } from './helpers/auth';
import { uniqueRunId } from './helpers/run-id';
import { createAllocationOnCurrentProject, createClientAndProject } from './helpers/workforce';
import { stepPaced } from './helpers/pace';

test.describe('Epic 09 — Deploy & Employee Self-Service', () => {
  test.setTimeout(180_000);

  test('Employee sees own assignments; PMO smoke-tests key workforce routes', async ({ page }) => {
    const runId = uniqueRunId();
    const projectName = `Deploy Project ${runId}`;
    const projectCode = `DEPLOY-${runId}`;

    await stepPaced(page,'PMO creates allocation for Employee One', async () => {
      await login(page, 'pmo.user');
      await createClientAndProject(page, `Deploy Client ${runId}`, projectName, projectCode);
      await createAllocationOnCurrentProject(page, { pct: 70, role: 'Developer' });
    });

    await stepPaced(page,'Employee opens My Assignments and sees own project', async () => {
      await relogin(page, 'employee');
      await page.getByRole('link', { name: 'My Assignments' }).click();
      await expect(page).toHaveURL(/\/my-assignments$/);
      await expect(page.getByRole('heading', { name: 'My Assignments' })).toBeVisible();
      await expect(page.getByRole('cell', { name: projectName })).toBeVisible();
    });

    await stepPaced(page,'Employee cannot access workforce admin routes', async () => {
      await page.goto('/workforce/import');
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    await stepPaced(page,'PMO smoke: all deploy routes load', async () => {
      await relogin(page, 'pmo.user');

      const routes: Array<{ link: string; heading: string }> = [
        { link: 'Projects/Services', heading: 'Projects/Services' },
        { link: 'Allocations', heading: 'Allocations' },
        { link: 'Bench/Availability', heading: 'Bench/Availability' },
        { link: 'Workforce Import', heading: 'Workforce Import' }
      ];

      for (const route of routes) {
        await page.getByRole('link', { name: route.link }).click();
        await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
      }
    });
  });
});

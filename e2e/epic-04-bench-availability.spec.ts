import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { uniqueRunId } from './helpers/run-id';
import { createAllocationOnCurrentProject, createClientAndProject } from './helpers/workforce';
import { stepPaced } from './helpers/pace';

test.describe('Epic 04 — Bench/Availability', () => {
  test.setTimeout(180_000);

  test('PMO reviews the bench after allocation', async ({ page }) => {
    const runId = uniqueRunId();

    await stepPaced(page,'Login as PMO and create allocation', async () => {
      await login(page, 'pmo.user');
      await createClientAndProject(
        page,
        `Bench Client ${runId}`,
        `Bench Project ${runId}`,
        `BENCH-${runId}`
      );
      await createAllocationOnCurrentProject(page, { pct: 80 });
    });

    await stepPaced(page,'Bench table loads', async () => {
      await page.getByRole('link', { name: 'Bench/Availability' }).click();
      await expect(page.getByRole('heading', { name: 'Bench/Availability' })).toBeVisible();
      await expect(page.getByRole('table')).toBeVisible();
    });

    await stepPaced(page,'Assigned employee is not on current bench list', async () => {
      await expect(page.getByRole('cell', { name: 'Employee One' })).toHaveCount(0);
    });
  });
});

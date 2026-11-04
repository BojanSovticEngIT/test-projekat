import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { uniqueRunId } from './helpers/run-id';
import { createClientAndProject } from './helpers/workforce';
import { stepPaced } from './helpers/pace';

test.describe('Epic 02 — Projects', () => {
  test.setTimeout(120_000);

  test('PMO creates client and project end-to-end', async ({ page }) => {
    const runId = uniqueRunId();
    const clientName = `E2E Client ${runId}`;
    const projectName = `Digital Transformation ${runId}`;
    const projectCode = `E2E-${runId}`;

    await stepPaced(page,'Login as PMO', async () => {
      await login(page, 'pmo.user');
    });

    await stepPaced(page,'Create client and project', async () => {
      await createClientAndProject(page, clientName, projectName, projectCode);
      await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    });

    await stepPaced(page,'Project appears in list', async () => {
      await page.getByRole('link', { name: 'Projects/Services' }).click();
      await expect(page.getByRole('heading', { name: 'Projects/Services' })).toBeVisible();
      await page.getByLabel('Project or Code').fill(projectCode);
      await expect(page.getByRole('cell', { name: projectName })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('cell', { name: projectCode })).toBeVisible();
    });
  });
});

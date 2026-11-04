import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { uniqueRunId } from './helpers/run-id';
import {
  createAdditionalProject,
  createAllocationOnCurrentProject,
  createClientAndProject
} from './helpers/workforce';
import { stepPaced } from './helpers/pace';

test.describe('Epic 03 — Allocations', () => {
  test.setTimeout(180_000);

  test('PMO allocates Employee One, detects conflict, and overrides second allocation', async ({ page }) => {
    const runId = uniqueRunId();
    const clientName = `Alloc Client ${runId}`;
    const projectOneName = `Project Alpha ${runId}`;
    const projectOneCode = `ALPHA-${runId}`;
    const projectTwoName = `Project Beta ${runId}`;
    const projectTwoCode = `BETA-${runId}`;

    await stepPaced(page,'Login as PMO', async () => {
      await login(page, 'pmo.user');
    });

    await stepPaced(page,'Create first project', async () => {
      await createClientAndProject(page, clientName, projectOneName, projectOneCode);
    });

    await stepPaced(page,'Allocate Employee One at 80%', async () => {
      await createAllocationOnCurrentProject(page, { pct: 80, role: 'Developer' });
    });

    await stepPaced(page,'Create second project', async () => {
      await createAdditionalProject(page, clientName, projectTwoName, projectTwoCode);
    });

    await stepPaced(page,'Second allocation triggers conflict and PMO override', async () => {
      await createAllocationOnCurrentProject(page, {
        pct: 30,
        role: 'Consultant',
        overrideReason: 'E2E epic 03 — mandatory override for 110% overallocation'
      });
    });

    await stepPaced(page,'Allocation history is readable', async () => {
      await page.getByRole('row', { name: /Employee One/ }).first().click();
      await expect(page).toHaveURL(/\/workforce\/allocations\/employee\/[0-9a-f-]+$/i);
      await page.getByRole('button', { name: 'History' }).first().click();
      await expect(page).toHaveURL(/\/workforce\/allocations\/[0-9a-f-]+\/history$/i);
      await expect(page.getByRole('heading', { name: 'Allocation History' })).toBeVisible();
      await page.getByRole('button', { name: 'Back to Allocations' }).click();
      await expect(page.getByRole('heading', { name: 'Allocations', exact: true })).toBeVisible();
    });
  });
});

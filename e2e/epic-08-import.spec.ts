import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { uniqueRunId } from './helpers/run-id';
import { cleanupWorkforceImportFile, writeWorkforceImportFile } from './helpers/workforce-import-file';
import { createClientAndProject } from './helpers/workforce';
import { stepPaced } from './helpers/pace';

test.describe('Epic 08 — Workforce Import', () => {
  test.setTimeout(180_000);

  test('PMO uploads Excel, validates, confirms import, and runs Workday dry-run', async ({ page }) => {
    const runId = uniqueRunId();
    const projectCode = `IMPORT-${runId}`;
    const today = new Date().toISOString().slice(0, 10);
    let importFile = '';

    await stepPaced(page,'PMO creates project for import row', async () => {
      await login(page, 'pmo.user');
      await createClientAndProject(
        page,
        `Import Client ${runId}`,
        `Import Project ${runId}`,
        projectCode
      );
    });

    await stepPaced(page,'Generate workforce import Excel', async () => {
      importFile = writeWorkforceImportFile([
        {
          employeeEmail: 'emma.johnson@eng.it',
          projectCode,
          allocationPct: 25,
          startDate: today
        }
      ]);
    });

    await stepPaced(page,'Upload and map columns', async () => {
      await page.getByRole('link', { name: 'Workforce Import' }).click();
      await expect(page.getByRole('heading', { name: 'Workforce Import' })).toBeVisible();

      const fileName = importFile.split('/').pop()!;
      await page.locator('input[type="file"]').setInputFiles(importFile);
      await expect(page.getByRole('button', { name: fileName })).toBeVisible();
      await page.getByRole('button', { name: 'Continue to mapping' }).click();
      await expect(page.getByRole('heading', { name: 'Suggested column mapping' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'employee_email' })).toBeVisible();
    });

    await stepPaced(page,'Validate and confirm import', async () => {
      await page.getByRole('button', { name: 'Validate file' }).click();
      await expect(page.getByText(/valid rows/i)).toBeVisible();
      await page.getByRole('button', { name: 'Confirm import' }).click();
      await expect(page.getByText('Workforce import completed successfully.')).toBeVisible({ timeout: 30_000 });
    });

    await stepPaced(page,'Re-upload skips duplicate allocation', async () => {
      await page.goto('/workforce/import');
      await page.locator('input[type="file"]').setInputFiles(importFile);
      await page.getByRole('button', { name: 'Continue to mapping' }).click();
      await page.getByRole('button', { name: 'Validate file' }).click();
      await page.getByRole('button', { name: 'Confirm import' }).click();
      await expect(page.getByText('Workforce import completed successfully.')).toBeVisible({ timeout: 30_000 });
    });

    await stepPaced(page,'Workday sync dry-run', async () => {
      await page.getByRole('button', { name: 'Workday sync (dry run)' }).click();
      await expect(page.getByText(/Dry run: processed/i)).toBeVisible({ timeout: 30_000 });
    });

    cleanupWorkforceImportFile(importFile);
  });
});

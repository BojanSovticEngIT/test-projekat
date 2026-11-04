import { test, expect } from '@playwright/test';
import { login, relogin } from './helpers/auth';
import { uniqueRunId } from './helpers/run-id';
import {
  createAllocationOnCurrentProject,
  createClientAndProject,
  navigateToEmployeeOneDetail
} from './helpers/workforce';
import { stepPaced } from './helpers/pace';

test.describe('Epic 06 — Engagement Skills', () => {
  test.setTimeout(180_000);

  test('Line Manager records Java and Spring Boot on Employee One allocation', async ({ page }) => {
    const runId = uniqueRunId();
    const projectName = `Skills Project ${runId}`;
    const projectCode = `SKILLS-${runId}`;

    await stepPaced(page,'PMO creates project and allocates Employee One', async () => {
      await login(page, 'pmo.user');
      await createClientAndProject(page, `Skills Client ${runId}`, projectName, projectCode);
      await createAllocationOnCurrentProject(page, { pct: 50, role: 'Developer' });
    });

    await stepPaced(page,'Line Manager opens engagement skills from employee profile', async () => {
      await relogin(page, 'manager');
      await navigateToEmployeeOneDetail(page, projectName);

      const allocationRow = page.getByRole('row', { name: new RegExp(projectName) });
      await allocationRow.getByRole('button', { name: 'Skills' }).click();

      const skillsDialog = page.getByRole('dialog', { name: 'Engagement Skills' });
      await expect(skillsDialog).toBeVisible();
      await expect(skillsDialog.getByText(/Employee One on/)).toBeVisible();
      await expect(skillsDialog.getByText(/Record skills actually used on this engagement/)).toBeVisible();
    });

    await stepPaced(page,'Add Java as primary practitioner skill', async () => {
      const skillsDialog = page.getByRole('dialog', { name: 'Engagement Skills' });
      const catalogField = skillsDialog.getByRole('combobox', { name: 'Catalog skill' });
      await catalogField.click();
      await catalogField.fill('Java');
      await page.getByRole('option', { name: 'Java' }).click();
      await skillsDialog.getByLabel('Level used').click();
      await page.getByRole('option', { name: 'Practitioner' }).click();
      await skillsDialog.getByLabel('Primary skill on this engagement').check();
      await skillsDialog.getByRole('button', { name: 'Add Skill' }).click();
      await expect(skillsDialog.getByRole('cell', { name: 'Java' })).toBeVisible();
      await expect(skillsDialog.getByRole('cell', { name: 'Primary' })).toBeVisible();
    });

    await stepPaced(page,'Add Spring Boot as supporting practitioner skill', async () => {
      const skillsDialog = page.getByRole('dialog', { name: 'Engagement Skills' });
      const catalogField = skillsDialog.getByRole('combobox', { name: 'Catalog skill' });
      await catalogField.click();
      await catalogField.fill('Spring Boot');
      await page.getByRole('option', { name: 'Spring Boot' }).click();
      await skillsDialog.getByLabel('Primary skill on this engagement').uncheck();
      await skillsDialog.getByRole('button', { name: 'Add Skill' }).click();
      await expect(skillsDialog.getByRole('cell', { name: 'Spring Boot' })).toBeVisible();
      await skillsDialog.getByRole('button', { name: 'Close' }).click();
      await expect(skillsDialog).toBeHidden();
    });
  });
});

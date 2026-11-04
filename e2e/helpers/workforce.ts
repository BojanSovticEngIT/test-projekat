import { expect, type Page } from '@playwright/test';
import { pace } from './pace';

export const EMPLOYEE_ONE_ID = 'e0000000-0000-0000-0000-000000000003';
export const EMPLOYEE_TWO_ID = 'e0000000-0000-0000-0000-000000000004';

export async function createClient(page: Page, clientName: string): Promise<void> {
  await page.getByRole('link', { name: 'Projects/Services' }).click();
  await expect(page.getByRole('heading', { name: 'Projects/Services' })).toBeVisible();
  await page.getByRole('button', { name: 'New Client' }).click();
  await expect(page).toHaveURL(/\/workforce\/clients\/new$/);
  await expect(page.getByRole('heading', { name: 'Create Client' })).toBeVisible();
  await page.getByLabel('Client Name').fill(clientName);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create Project' })).toBeVisible();
  await pace(page);
}

async function fillProjectFields(
  page: Page,
  projectName: string,
  projectCode: string,
  clientName?: string
): Promise<void> {
  if (clientName) {
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: new RegExp(clientName) }).first().click();
  }
  await page.getByRole('textbox', { name: 'Name' }).fill(projectName);
  await page.getByRole('textbox', { name: 'Code' }).fill(projectCode);
}

export async function fillCreateProjectForm(
  page: Page,
  projectName: string,
  projectCode: string,
  clientName?: string
): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Create Project' })).toBeVisible();
  await fillProjectFields(page, projectName, projectCode, clientName);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
}

async function openProjectFromList(page: Page, projectName: string): Promise<void> {
  await expect(page).toHaveURL(/\/workforce\/projects$/);
  await page.getByRole('cell', { name: projectName }).first().click();
}

export async function createClientAndProject(
  page: Page,
  clientName: string,
  projectName: string,
  projectCode: string
): Promise<string> {
  await createClient(page, clientName);
  await fillCreateProjectForm(page, projectName, projectCode);
  await openProjectFromList(page, projectName);
  await expect(page).toHaveURL(/\/workforce\/projects\/[0-9a-f-]+$/i);
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
  await pace(page);
  return page.url();
}

export async function createAdditionalProject(
  page: Page,
  clientName: string,
  projectName: string,
  projectCode: string
): Promise<string> {
  await page.getByRole('link', { name: 'Projects/Services' }).click();
  await page.getByRole('button', { name: 'New Project' }).click();
  await fillCreateProjectForm(page, projectName, projectCode, clientName);
  await openProjectFromList(page, projectName);
  await expect(page).toHaveURL(/\/workforce\/projects\/[0-9a-f-]+$/i);
  await pace(page);
  return page.url();
}

export async function confirmAllocationForm(
  page: Page,
  options: { overrideReason?: string } = {}
): Promise<void> {
  const overrideReason =
    options.overrideReason ?? 'Prior allocations from earlier runs — PMO override';
  const onCreatePage = (): boolean => /\/workforce\/allocations\/new$/.test(page.url());

  await page.getByRole('button', { name: 'Create', exact: true }).click();

  const overrideButton = page.getByRole('button', { name: 'Override & Create' });

  // After Create: either redirects to the list or overallocation shows override UI
  await expect
    .poll(
      async () => {
        if (!onCreatePage()) {
          return 'closed';
        }
        if (await overrideButton.isVisible()) {
          return 'override';
        }
        return 'waiting';
      },
      { timeout: 20_000 }
    )
    .not.toBe('waiting');

  if (onCreatePage()) {
    await expect(overrideButton).toBeVisible();
    await page.getByLabel('Override reason').fill(overrideReason);
    await overrideButton.click();
    await expect(page).toHaveURL(/\/workforce\/allocations$/, { timeout: 20_000 });
  }

  await pace(page);
}

export async function createAllocationOnCurrentProject(
  page: Page,
  options: {
    pct: number;
    role?: string;
    employeeSearch?: string;
    employeeOption?: string;
    employeeCellName?: string;
    overrideReason?: string;
  }
): Promise<void> {
  const employeeSearch = options.employeeSearch ?? 'Employee';
  const employeeOption = options.employeeOption ?? 'Employee One (EMP003)';
  const employeeCellName = options.employeeCellName ?? 'Employee One';
  const role = options.role ?? 'Developer';

  // Allocations live on their own page; the project to allocate to is the one currently open.
  const projectName = (await page.getByRole('heading', { level: 4 }).first().innerText()).trim();
  await page.getByRole('link', { name: 'Allocations' }).click();
  await expect(page.getByRole('heading', { name: 'Allocations' })).toBeVisible();
  await page.getByRole('button', { name: 'New Allocation' }).click();
  await expect(page).toHaveURL(/\/workforce\/allocations\/new$/);
  await expect(page.getByRole('heading', { name: 'Create Allocation' })).toBeVisible();
  const projectField = page.getByRole('combobox', { name: 'Project' });
  await projectField.click();
  await projectField.fill(projectName);
  await page.getByRole('option', { name: new RegExp(projectName) }).click();
  const employeeField = page.getByRole('combobox', { name: 'Employee' });
  await employeeField.click();
  await employeeField.fill(employeeSearch);
  await page.getByRole('option', { name: employeeOption }).click();
  await page.getByRole('textbox', { name: 'Role on project' }).fill(role);
  await page.getByRole('spinbutton', { name: 'Allocation %' }).fill(String(options.pct));
  await confirmAllocationForm(page, {
    overrideReason: options.overrideReason
  });

  await expect(page.getByRole('row', { name: new RegExp(employeeCellName) }).first()).toBeVisible();
  await pace(page);
}

export async function navigateToEmployeeOneDetail(page: Page, projectName?: string): Promise<void> {
  await page.goto(`/employees/${EMPLOYEE_ONE_ID}`);
  await expect(page.getByRole('heading', { name: 'Project Allocations' })).toBeVisible();
  if (projectName) {
    await expect(page.getByRole('cell', { name: projectName })).toBeVisible({ timeout: 30_000 });
  }
}

export async function navigateToEmployeeOneAsManager(page: Page, projectName?: string): Promise<void> {
  await page.getByRole('link', { name: 'My Team' }).click();
  await expect(page.getByRole('heading', { name: 'My Team' })).toBeVisible();
  await page.getByLabel('Search').fill('EMP003');
  await page.getByRole('row', { name: /Employee One/i }).click();
  await navigateToEmployeeOneDetail(page, projectName);
}

export async function openNotificationMenu(page: Page): Promise<void> {
  await page.locator('.MuiBadge-root button').click();
  await expect(page.getByText('Notifications')).toBeVisible();
}

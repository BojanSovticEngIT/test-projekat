import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Extra pause after major steps when watching headed runs (E2E_STEP_PAUSE ms). */
export async function pace(page: Page): Promise<void> {
  const ms = Number(process.env.E2E_STEP_PAUSE ?? 0);
  if (ms > 0) {
    await page.waitForTimeout(ms);
  }
}

/** Like test.step, but pauses afterward when E2E_STEP_PAUSE is set (headed watch runs). */
export async function stepPaced(
  page: Page,
  title: string,
  body: () => Promise<void>
): Promise<void> {
  await test.step(title, body);
  await pace(page);
}
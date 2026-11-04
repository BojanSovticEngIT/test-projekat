import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const headed =
  process.env.E2E_HEADED === '1' || process.argv.includes('--headed') || process.argv.includes('--ui');
const slowMo = headed ? Number(process.env.E2E_SLOW_MO ?? 4000) : undefined;

export default defineConfig({
  testDir: '.',
  testMatch: ['epic-*.spec.ts', 'm1-regression.spec.ts'],
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: headed ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: headed ? 'on' : 'on-first-retry',
    screenshot: headed ? 'on' : 'only-on-failure',
    video: headed ? 'on' : 'retain-on-failure',
    headless: !headed,
    launchOptions: slowMo ? { slowMo } : undefined
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});

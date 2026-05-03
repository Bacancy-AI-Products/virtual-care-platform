import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Playwright configuration for TeleCare frontend E2E tests.
 *
 * No .env file is used — all test-only config is defined here so Playwright
 * stays self-contained and isolated from app runtime config.
 *
 * Run:
 *   npm run test:e2e          - run all tests headless
 *   npm run test:e2e:ui       - interactive UI mode
 *   npm run test:e2e:debug    - debug a single test
 *   npm run test:e2e:report   - open last HTML report
 *
 * Prereqs (one-time):
 *   1. cd backend && npm run seed     (creates seed users with password Demo@1234)
 *   2. cd frontend && npx playwright install
 */

export const TEST_CONFIG = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:4001',
  apiUrl: 'http://localhost:4001/api/v1',
} as const;

const BACKEND_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../backend');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // sequential — shared seed data is not isolated per-test
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: TEST_CONFIG.frontendUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Enable when cross-browser coverage is needed:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari']  } },
  ],

  // Auto-start backend (4001) and frontend (3000) before tests.
  // Both reuse existing servers locally so re-runs are fast.
  webServer: [
    {
      command: 'npm run dev',
      cwd: BACKEND_DIR,
      url: TEST_CONFIG.backendUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      url: TEST_CONFIG.frontendUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});

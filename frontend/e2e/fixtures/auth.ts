import { test as base, expect, Page } from '@playwright/test';
import { PATIENT, DOCTOR } from './credentials';

/**
 * Reusable login helper. Submits the login form and waits until the
 * URL switches to the role's dashboard (proves auth state is set).
 */
export async function loginAs(
    page: Page,
    user: { email: string; password: string },
    expectedRedirect: RegExp,
) {
    await page.goto('/login');

    await page.locator('input[placeholder="name@example.com or 9876543210"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByRole('button', { name: /^login$/i }).click();

    await page.waitForURL(expectedRedirect, { timeout: 10_000 });
}

/**
 * Custom fixtures — `patientPage` and `doctorPage` come pre-authenticated.
 *
 * Usage:
 *   import { test, expect } from './fixtures/auth';
 *   test('...', async ({ patientPage }) => { ... });
 */
export const test = base.extend<{
    patientPage: Page;
    doctorPage: Page;
}>({
    patientPage: async ({ page }, use) => {
        await loginAs(page, PATIENT, /\/patient\/dashboard/);
        await use(page);
    },
    doctorPage: async ({ page }, use) => {
        await loginAs(page, DOCTOR, /\/doctor\/dashboard/);
        await use(page);
    },
});

export { expect };

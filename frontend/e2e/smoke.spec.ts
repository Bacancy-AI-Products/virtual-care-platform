import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify public pages render without errors.
 * These don't depend on seed data or auth.
 */
test.describe('Smoke', () => {
    test('landing page loads', async ({ page }) => {
        const res = await page.goto('/');
        expect(res?.ok()).toBeTruthy();
    });

    test('login page renders form', async ({ page }) => {
        await page.goto('/login');
        await expect(
            page.locator('input[placeholder="name@example.com or 9876543210"]'),
        ).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible();
    });

    test('signup page renders role switcher', async ({ page }) => {
        await page.goto('/signup');
        await expect(page.getByRole('button', { name: /^patient$/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /^doctor$/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });

    test('public doctors listing reachable', async ({ page }) => {
        const res = await page.goto('/doctors');
        expect(res?.ok()).toBeTruthy();
    });
});

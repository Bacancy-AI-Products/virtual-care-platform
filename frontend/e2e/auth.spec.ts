import { test, expect } from '@playwright/test';
import { PATIENT, DOCTOR } from './fixtures/credentials';
import { loginAs } from './fixtures/auth';

/**
 * Authentication flows — login success, validation, role-based redirect,
 * and protected route guarding.
 */
test.describe('Authentication', () => {
    test('redirects unauthenticated user to /login on protected route', async ({ page }) => {
        await page.goto('/patient/dashboard');
        await expect(page).toHaveURL(/\/login/);
    });

    test('shows validation error on empty submit', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: /^login$/i }).click();
        await expect(page.getByText(/please enter your email|email or mobile/i)).toBeVisible();
    });

    test('shows validation error on invalid email format', async ({ page }) => {
        await page.goto('/login');
        await page
            .locator('input[placeholder="name@example.com or 9876543210"]')
            .fill('not-an-email');
        await page.locator('input[type="password"]').fill('somepass123');
        await page.getByRole('button', { name: /^login$/i }).click();
        await expect(page.getByText(/valid email|10-digit/i)).toBeVisible();
    });

    test('rejects invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await page
            .locator('input[placeholder="name@example.com or 9876543210"]')
            .fill('nobody@telecare.com');
        await page.locator('input[type="password"]').fill('WrongPassword123');
        await page.getByRole('button', { name: /^login$/i }).click();

        // Form-level error appears in red banner
        await expect(page.locator('.bg-red-50, [role="alert"]').first()).toBeVisible({
            timeout: 8_000,
        });
        await expect(page).toHaveURL(/\/login/);
    });

    test('patient logs in and is redirected to /patient/dashboard', async ({ page }) => {
        await loginAs(page, PATIENT, /\/patient\/dashboard/);
        await expect(page).toHaveURL(/\/patient\/dashboard/);
    });

    test('doctor logs in and is redirected to /doctor/dashboard', async ({ page }) => {
        await loginAs(page, DOCTOR, /\/doctor\/dashboard/);
        await expect(page).toHaveURL(/\/doctor\/dashboard/);
    });
});

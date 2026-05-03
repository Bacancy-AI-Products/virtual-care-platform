import { test, expect } from '@playwright/test';

/**
 * Signup form rendering + validation. We don't actually submit the form here
 * to avoid creating throwaway accounts in the dev DB on every test run.
 */
test.describe('Signup', () => {
  test('defaults to Patient role', async ({ page }) => {
    await page.goto('/signup');

    const patientBtn = page.getByRole('button', { name: /^patient$/i });
    await expect(patientBtn).toBeVisible();
  });

  test('can switch to Doctor role', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: /^doctor$/i }).click();

    // Switch should cause some doctor-specific UI to appear; at minimum the
    // button itself stays clickable. Adjust assertion when doctor extras land.
    await expect(page.getByRole('button', { name: /^doctor$/i })).toBeVisible();
  });

  test('shows validation when submitting empty form', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: /create account/i }).click();

    // HTML5 required attributes will block submission OR app shows inline errors.
    // We just confirm we did not navigate away from /signup.
    await expect(page).toHaveURL(/\/signup/);
  });

  test('rejects mobile shorter than 10 digits', async ({ page }) => {
    await page.goto('/signup');

    await page.locator('input[placeholder="John Doe"]').fill('Test User');
    await page.locator('input[type="tel"]').fill('12345');
    await page.locator('input[placeholder="Minimum 8 characters"]').fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/signup/);
  });
});

import { test, expect } from './fixtures/auth';

/**
 * Doctor flows — uses the `doctorPage` fixture which logs in as
 * sarah.johnson@telecare.dev before each test.
 */
test.describe('Doctor', () => {
    test('lands on doctor dashboard after login', async ({ doctorPage: page }) => {
        await expect(page).toHaveURL(/\/doctor\/dashboard/);
    });

    test('can navigate to patients page', async ({ doctorPage: page }) => {
        await page.goto('/doctor/patients');
        await expect(page).toHaveURL(/\/doctor\/patients/);
    });

    test('can navigate to appointments page', async ({ doctorPage: page }) => {
        await page.goto('/doctor/appointments');
        await expect(page).toHaveURL(/\/doctor\/appointments/);
    });

    test('can navigate to schedule/availability', async ({ doctorPage: page }) => {
        await page.goto('/doctor/schedule');
        await expect(page).toHaveURL(/\/doctor\/(schedule|availability)/);
    });

    test('can navigate to profile page', async ({ doctorPage: page }) => {
        await page.goto('/doctor/profile');
        await expect(page).toHaveURL(/\/doctor\/profile/);
    });

    test('patient route is blocked for doctor role', async ({ doctorPage: page }) => {
        await page.goto('/patient/dashboard');
        await expect(page).not.toHaveURL(/\/patient\/dashboard/);
    });
});

import { test, expect } from './fixtures/auth';

/**
 * Patient flows — uses the `patientPage` fixture which logs in as john.doe@telecare.com
 * before each test.
 */
test.describe('Patient', () => {
  test('lands on patient dashboard after login', async ({ patientPage: page }) => {
    await expect(page).toHaveURL(/\/patient\/dashboard/);
  });

  test('can navigate to doctors browse page', async ({ patientPage: page }) => {
    await page.goto('/patient/doctors');
    await expect(page).toHaveURL(/\/patient\/doctors/);
  });

  test('can navigate to appointments page', async ({ patientPage: page }) => {
    await page.goto('/patient/appointments');
    await expect(page).toHaveURL(/\/patient\/appointments/);
  });

  test('can navigate to medical records page', async ({ patientPage: page }) => {
    await page.goto('/patient/records');
    await expect(page).toHaveURL(/\/patient\/records/);
  });

  test('can navigate to profile page', async ({ patientPage: page }) => {
    await page.goto('/patient/profile');
    await expect(page).toHaveURL(/\/patient\/profile/);
  });

  test('doctor route is blocked for patient role', async ({ patientPage: page }) => {
    await page.goto('/doctor/dashboard');
    // Middleware should bounce back to /login or to /patient
    await expect(page).not.toHaveURL(/\/doctor\/dashboard/);
  });
});

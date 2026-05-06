import { test, expect } from './fixtures/auth';
import { DOCTOR } from './fixtures/credentials';

/**
 * Appointment booking flow — patient browses doctors and lands on a doctor detail page.
 *
 * Note: Final booking confirmation depends on UI specifics that may evolve;
 * the deeper steps (slot pick + confirm) are scaffolded with `test.fixme` so
 * they don't fail CI until the selectors are stabilized via data-testid attrs.
 */
test.describe('Appointment booking (patient)', () => {
    test('patient sees doctors list', async ({ patientPage: page }) => {
        await page.goto('/patient/doctors');
        await expect(page).toHaveURL(/\/patient\/doctors/);

        // At least one doctor card should render (seed has 30 doctors)
        const cards = page.locator('a[href^="/patient/doctors/"], a[href^="/doctors/"]');
        await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    });

    test('patient can open a doctor detail page', async ({ patientPage: page }) => {
        await page.goto('/patient/doctors');

        const firstDoctorLink = page
            .locator('a[href^="/patient/doctors/"], a[href^="/doctors/"]')
            .first();
        await expect(firstDoctorLink).toBeVisible({ timeout: 10_000 });
        await firstDoctorLink.click();

        await expect(page).toHaveURL(/\/(patient\/)?doctors\/[\w-]+/);
    });

    test.fixme('patient can complete booking flow end-to-end', async ({ patientPage: page }) => {
        // Stabilize once data-testid attrs are added to:
        // - doctor card "Book" CTA
        // - slot picker buttons
        // - confirm modal
        await page.goto('/patient/doctors');
        await page
            .getByRole('button', { name: /book|schedule|consult/i })
            .first()
            .click();
        await page
            .getByRole('button', { name: /available|select/i })
            .first()
            .click();
        await page.getByRole('button', { name: /confirm|book now/i }).click();
        await expect(page.getByText(/confirmed|booked|success/i)).toBeVisible();
    });
});

test.describe('Appointment list (doctor)', () => {
    test('doctor sees their appointments page', async ({ doctorPage: page }) => {
        await page.goto('/doctor/appointments');
        await expect(page).toHaveURL(/\/doctor\/appointments/);

        // Seed creates a confirmed appointment ~90 min from now between
        // sarah.johnson@telecare.dev and john.doe@telecare.com — so the
        // doctor's list should not be empty for this fixture user.
        const patientReference = page.getByText(new RegExp('John Doe|john.doe', 'i'));
        await expect(patientReference.first()).toBeVisible({ timeout: 10_000 });
    });

    test('doctor name visible on patient appointments page', async ({ patientPage: page }) => {
        await page.goto('/patient/appointments');
        await expect(page).toHaveURL(/\/patient\/appointments/);

        // The seed appointment links john.doe to sarah.johnson — check the doctor's name renders.
        const doctorReference = page.getByText(new RegExp(DOCTOR.name, 'i'));
        await expect(doctorReference.first()).toBeVisible({ timeout: 10_000 });
    });
});

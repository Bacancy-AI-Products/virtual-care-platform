/**
 * Seed credentials for E2E tests.
 *
 * Source of truth: backend/prisma/seed.ts
 * Run `cd backend && npm run seed` before tests if DB is empty.
 *
 * All seeded accounts use the same password.
 */

export const SEED_PASSWORD = 'Demo@1234';

export const PATIENT = {
    email: 'john.doe@telecare.com',
    password: SEED_PASSWORD,
    name: 'John Doe',
} as const;

export const DOCTOR = {
    email: 'sarah.johnson@telecare.dev',
    password: SEED_PASSWORD,
    name: 'Sarah Johnson',
    specialization: 'General Physician',
} as const;

/**
 * Demo: DB integration test. Real Postgres, real Prisma, real bcrypt.
 *
 * Why this style:
 *   - We don't mock Prisma — we'd just be testing the mock.
 *   - We don't mock bcrypt — verifying real hash/compare proves the wiring is correct.
 *   - We *do* mock the email module — SMTP is an external wire we don't control in tests.
 */
import '../../../test/setupDb';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '../../../generated/prisma';
import { prisma } from '../../db';
import { aPatientInput } from '../../../test/factories';

// Email is the one external wire — stub it so tests don't depend on Mailpit being up.
vi.mock('../email', () => ({
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
}));

import { login, signup } from './auth.service';
import { AppError } from '../../utils/errors';

describe('auth.service.signup', () => {
    it('creates a user, hashes the password, and returns a signed token', async () => {
        const input = aPatientInput();

        const result = await signup(input.name, input.email, input.password, Role.PATIENT);

        expect(result.token).toEqual(expect.any(String));
        expect(result.user.email).toBe(input.email);
        expect(result.user.role).toBe(Role.PATIENT);

        // Real DB row exists with a real bcrypt hash (not the plaintext password).
        const stored = await prisma.user.findUnique({ where: { email: input.email } });
        expect(stored).not.toBeNull();
        expect(stored!.passwordHash).not.toBe(input.password);
        expect(stored!.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix
    });

    it('also creates a Patient row for PATIENT signups', async () => {
        const input = aPatientInput();

        await signup(input.name, input.email, input.password, Role.PATIENT);

        const user = await prisma.user.findUnique({
            where: { email: input.email },
            include: { patient: true },
        });
        expect(user?.patient).not.toBeNull();
    });

    it('rejects duplicate email with a 409 AppError', async () => {
        const input = aPatientInput();
        await signup(input.name, input.email, input.password, Role.PATIENT);

        await expect(
            signup(input.name, input.email, input.password, Role.PATIENT),
        ).rejects.toMatchObject({
            status: 409,
            code: 'CONFLICT',
        });
    });
});

describe('auth.service.login', () => {
    it('returns a token for valid credentials', async () => {
        const input = aPatientInput();
        await signup(input.name, input.email, input.password, Role.PATIENT);

        const result = await login(input.email, input.password);
        expect(result.token).toEqual(expect.any(String));
        expect(result.user.email).toBe(input.email);
    });

    it('rejects wrong password with the generic 401 message (no email leak)', async () => {
        const input = aPatientInput();
        await signup(input.name, input.email, input.password, Role.PATIENT);

        await expect(login(input.email, 'WrongPass@123')).rejects.toBeInstanceOf(AppError);
        await expect(login(input.email, 'WrongPass@123')).rejects.toMatchObject({
            status: 401,
            message: 'Invalid email or password',
        });
    });

    it('returns the same generic error when the email does not exist', async () => {
        await expect(login('nobody@telecare.local', 'whatever')).rejects.toMatchObject({
            status: 401,
            message: 'Invalid email or password',
        });
    });
});

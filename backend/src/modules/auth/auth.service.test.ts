/**
 * Service-layer tests for the auth module. Real DB, real Prisma, real bcrypt.
 * Only the email module is mocked (external wire — SMTP).
 */
import '../../../test/setupDb';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '../../../generated/prisma';
import { prisma } from '../../db';
import { aPatientInput, createPatient } from '../../../test/factories';

vi.mock('../email', () => ({
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
}));

import {
    assertTokenNotRevoked,
    login,
    requestPasswordReset,
    resetPassword,
    revokeSessions,
    signup,
} from './auth.service';
import { sendPasswordReset } from '../email';
import { AppError } from '../../utils/errors';

// ─── signup ───────────────────────────────────────────────────────────────────

describe('auth.service.signup', () => {
    it('creates a user, hashes the password, and returns a signed token', async () => {
        const input = aPatientInput();

        const result = await signup(input.name, input.email, input.password, Role.PATIENT);

        expect(result.token).toEqual(expect.any(String));
        expect(result.user.email).toBe(input.email);
        expect(result.user.role).toBe(Role.PATIENT);

        const stored = await prisma.user.findUnique({ where: { email: input.email } });
        expect(stored).not.toBeNull();
        expect(stored!.passwordHash).not.toBe(input.password);
        expect(stored!.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('creates a Patient row for PATIENT signups', async () => {
        const input = aPatientInput();

        await signup(input.name, input.email, input.password, Role.PATIENT);

        const user = await prisma.user.findUnique({
            where: { email: input.email },
            include: { patient: true, doctorProfile: true },
        });
        expect(user?.patient).not.toBeNull();
        expect(user?.doctorProfile).toBeNull();
    });

    it('creates a DoctorProfile (with placeholder specialization) for DOCTOR signups', async () => {
        const input = aPatientInput();

        await signup(input.name, input.email, input.password, Role.DOCTOR);

        const user = await prisma.user.findUnique({
            where: { email: input.email },
            include: { patient: true, doctorProfile: true },
        });
        expect(user?.doctorProfile).not.toBeNull();
        expect(user?.doctorProfile?.specialization).toBe('Pending');
        expect(user?.patient).toBeNull();
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

// ─── login ────────────────────────────────────────────────────────────────────

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

    it('returns the same generic error for an unknown email (anti-enumeration)', async () => {
        await expect(login('nobody@telecare.local', 'whatever')).rejects.toMatchObject({
            status: 401,
            message: 'Invalid email or password',
        });
    });
});

// ─── password reset ───────────────────────────────────────────────────────────

describe('auth.service.requestPasswordReset', () => {
    it('writes a reset token + expiry on the user row and triggers email send', async () => {
        const patient = await createPatient();

        await requestPasswordReset(patient.email);

        const user = await prisma.user.findUnique({ where: { id: patient.userId } });
        expect(user?.passwordResetToken).toEqual(expect.any(String));
        expect(user?.passwordResetExpires).toBeInstanceOf(Date);
        expect(user!.passwordResetExpires!.getTime()).toBeGreaterThan(Date.now());
        expect(sendPasswordReset).toHaveBeenCalledOnce();
    });

    it('returns the same generic message for an unknown email and does NOT send mail', async () => {
        vi.mocked(sendPasswordReset).mockClear();

        const result = await requestPasswordReset('nobody@telecare.local');

        expect(result.message).toMatch(/if an account exists/i);
        expect(sendPasswordReset).not.toHaveBeenCalled();
    });
});

describe('auth.service.resetPassword', () => {
    it('changes the password and bumps tokenVersion (revokes existing sessions)', async () => {
        const patient = await createPatient();
        await requestPasswordReset(patient.email);
        const before = await prisma.user.findUnique({ where: { id: patient.userId } });

        await resetPassword(before!.passwordResetToken!, 'NewPass@123');

        const after = await prisma.user.findUnique({ where: { id: patient.userId } });
        expect(after?.passwordResetToken).toBeNull();
        expect(after?.passwordResetExpires).toBeNull();
        expect(after?.tokenVersion).toBe(before!.tokenVersion + 1);
        expect(after?.passwordHash).not.toBe(before?.passwordHash);
    });

    it('rejects an unknown token with 400 BAD_REQUEST', async () => {
        await expect(resetPassword('not-a-real-token', 'NewPass@123')).rejects.toMatchObject({
            status: 400,
            code: 'BAD_REQUEST',
        });
    });

    it('rejects an expired token', async () => {
        const patient = await createPatient();
        await prisma.user.update({
            where: { id: patient.userId },
            data: {
                passwordResetToken: 'expired-token-abc',
                passwordResetExpires: new Date(Date.now() - 60_000), // 1 min in the past
            },
        });

        await expect(resetPassword('expired-token-abc', 'NewPass@123')).rejects.toMatchObject({
            status: 400,
            code: 'BAD_REQUEST',
        });
    });
});

// ─── token revocation ─────────────────────────────────────────────────────────

describe('auth.service.assertTokenNotRevoked', () => {
    it('passes when token version matches the user', async () => {
        const patient = await createPatient();
        await expect(assertTokenNotRevoked(patient.userId, 0)).resolves.toBeUndefined();
    });

    it('throws 401 when token version is stale', async () => {
        const patient = await createPatient();
        await revokeSessions(patient.userId);

        await expect(assertTokenNotRevoked(patient.userId, 0)).rejects.toMatchObject({
            status: 401,
            code: 'UNAUTHORIZED',
        });
    });

    it('throws 401 for an unknown user', async () => {
        await expect(
            assertTokenNotRevoked('00000000-0000-0000-0000-000000000000', 0),
        ).rejects.toMatchObject({
            status: 401,
            code: 'UNAUTHORIZED',
        });
    });

    it('treats undefined tokenVersion as 0 (legacy tokens issued before tv field)', async () => {
        const patient = await createPatient(); // fresh user, tokenVersion = 0
        await expect(assertTokenNotRevoked(patient.userId)).resolves.toBeUndefined();
    });
});

describe('auth.service.revokeSessions', () => {
    it('increments tokenVersion on the user row', async () => {
        const patient = await createPatient();
        const before = await prisma.user.findUnique({ where: { id: patient.userId } });

        await revokeSessions(patient.userId);

        const after = await prisma.user.findUnique({ where: { id: patient.userId } });
        expect(after!.tokenVersion).toBe(before!.tokenVersion + 1);
    });
});

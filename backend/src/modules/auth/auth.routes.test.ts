/**
 * Route integration tests via supertest. Real Express app, real router,
 * real middleware, real Prisma, real DB. Email module is mocked.
 *
 * Goal: protect the contract (status codes + response shape) the frontend
 * depends on. Avoid re-testing service-layer logic — that's in auth.service.test.ts.
 */
import '../../../test/setupDb';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../../db';
import { createPatient } from '../../../test/factories';
import { signToken } from '../../utils';

vi.mock('../email', () => ({
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    sendAppointmentConfirmation: vi.fn().mockResolvedValue(undefined),
    sendAppointmentDeclined: vi.fn().mockResolvedValue(undefined),
}));

import { app } from '../../app';

// ─── signup ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/signup/patient', () => {
    it('returns 201 with token + user on valid input', async () => {
        const res = await request(app).post('/api/v1/auth/signup/patient').send({
            name: 'Jane Patient',
            email: 'jane.patient@telecare.local',
            password: 'Demo@1234',
        });

        expect(res.status).toBe(201);
        expect(res.body.token).toEqual(expect.any(String));
        expect(res.body.user).toMatchObject({
            email: 'jane.patient@telecare.local',
            role: 'PATIENT',
        });
    });

    it('returns 400 VALIDATION_ERROR on missing fields', async () => {
        const res = await request(app)
            .post('/api/v1/auth/signup/patient')
            .send({ email: 'no-name@telecare.local' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 on short password (Zod min(8))', async () => {
        const res = await request(app).post('/api/v1/auth/signup/patient').send({
            name: 'Pat',
            email: 'pat@telecare.local',
            password: 'short',
        });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 on duplicate email', async () => {
        await request(app).post('/api/v1/auth/signup/patient').send({
            name: 'First',
            email: 'dup@telecare.local',
            password: 'Demo@1234',
        });
        const res = await request(app).post('/api/v1/auth/signup/patient').send({
            name: 'Second',
            email: 'dup@telecare.local',
            password: 'Demo@1234',
        });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
    });
});

describe('POST /api/v1/auth/signup/doctor', () => {
    it('returns 201 and creates a DoctorProfile (not Patient)', async () => {
        const res = await request(app).post('/api/v1/auth/signup/doctor').send({
            name: 'Dr. Strange',
            email: 'strange@telecare.local',
            password: 'Demo@1234',
        });

        expect(res.status).toBe(201);
        expect(res.body.user.role).toBe('DOCTOR');

        const user = await prisma.user.findUnique({
            where: { email: 'strange@telecare.local' },
            include: { doctorProfile: true, patient: true },
        });
        expect(user?.doctorProfile).not.toBeNull();
        expect(user?.patient).toBeNull();
    });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
    it('returns 200 with token for valid credentials', async () => {
        await request(app).post('/api/v1/auth/signup/patient').send({
            name: 'Login Test',
            email: 'login@telecare.local',
            password: 'Demo@1234',
        });

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'login@telecare.local', password: 'Demo@1234' });

        expect(res.status).toBe(200);
        expect(res.body.token).toEqual(expect.any(String));
    });

    it('returns 401 for unknown email with generic message (no enumeration leak)', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'nobody@telecare.local', password: 'Demo@1234' });

        expect(res.status).toBe(401);
        expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('returns 401 for wrong password with the same generic message', async () => {
        await request(app).post('/api/v1/auth/signup/patient').send({
            name: 'Pass Test',
            email: 'pass@telecare.local',
            password: 'Demo@1234',
        });

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'pass@telecare.local', password: 'Wrong@123' });

        expect(res.status).toBe(401);
        expect(res.body.error.message).toBe('Invalid email or password');
    });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
    it('returns 401 without an Authorization header', async () => {
        const res = await request(app).post('/api/v1/auth/logout');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 204 and bumps tokenVersion when authenticated', async () => {
        const patient = await createPatient();
        const token = signToken({ sub: patient.userId, role: 'PATIENT', tv: 0 });

        const res = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(204);
        const after = await prisma.user.findUnique({ where: { id: patient.userId } });
        expect(after!.tokenVersion).toBe(1);
    });

    it('rejects a token whose tv is stale (already-revoked session)', async () => {
        const patient = await createPatient();
        const staleToken = signToken({ sub: patient.userId, role: 'PATIENT', tv: 0 });
        // Bump tokenVersion via a logout to simulate "this token has been revoked"
        await prisma.user.update({
            where: { id: patient.userId },
            data: { tokenVersion: 1 },
        });

        const res = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${staleToken}`);

        expect(res.status).toBe(401);
    });
});

// ─── password reset ───────────────────────────────────────────────────────────

describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 200 with generic message whether the email exists or not', async () => {
        const r1 = await request(app)
            .post('/api/v1/auth/forgot-password')
            .send({ email: 'nobody@telecare.local' });
        expect(r1.status).toBe(200);
        expect(r1.body.message).toMatch(/if an account exists/i);

        const patient = await createPatient();
        const r2 = await request(app)
            .post('/api/v1/auth/forgot-password')
            .send({ email: patient.email });
        expect(r2.status).toBe(200);
        expect(r2.body.message).toBe(r1.body.message); // same exact message — anti-enumeration
    });

    it('returns 400 on invalid email format', async () => {
        const res = await request(app)
            .post('/api/v1/auth/forgot-password')
            .send({ email: 'not-an-email' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});

describe('POST /api/v1/auth/reset-password', () => {
    it('returns 200 and clears the reset token on success', async () => {
        const patient = await createPatient();
        await request(app).post('/api/v1/auth/forgot-password').send({ email: patient.email });
        const fresh = await prisma.user.findUnique({ where: { id: patient.userId } });

        const res = await request(app).post('/api/v1/auth/reset-password').send({
            token: fresh!.passwordResetToken,
            newPassword: 'BrandNew@123',
        });

        expect(res.status).toBe(200);
        const after = await prisma.user.findUnique({ where: { id: patient.userId } });
        expect(after?.passwordResetToken).toBeNull();
    });

    it('returns 400 on an unknown token', async () => {
        const res = await request(app).post('/api/v1/auth/reset-password').send({
            token: 'not-a-real-token',
            newPassword: 'BrandNew@123',
        });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('BAD_REQUEST');
    });
});

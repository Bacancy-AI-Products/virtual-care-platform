/**
 * Demo: route integration via supertest. Real Express app, real router, real
 * middleware, real Prisma, real DB. Email module mocked (external wire).
 *
 * Asserts the *contract* — status codes and response shape — that the frontend
 * depends on. Don't add tests here that already pass in Playwright.
 */
import '../../../test/setupDb';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../email', () => ({
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    sendAppointmentConfirmation: vi.fn().mockResolvedValue(undefined),
}));

import { app } from '../../app';

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

    it('returns 400 with VALIDATION_ERROR code on missing fields', async () => {
        const res = await request(app)
            .post('/api/v1/auth/signup/patient')
            .send({ email: 'no-name@telecare.local' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});

describe('POST /api/v1/auth/login', () => {
    it('returns 401 for unknown email with generic message (no enumeration leak)', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'nobody@telecare.local', password: 'Demo@1234' });

        expect(res.status).toBe(401);
        expect(res.body.error.message).toBe('Invalid email or password');
    });
});

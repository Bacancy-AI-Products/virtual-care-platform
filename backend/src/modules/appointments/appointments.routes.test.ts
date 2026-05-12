/**
 * Route integration tests for /api/v1/appointments via supertest.
 *
 * Goal: assert the HTTP contract — auth, role guards, validation, status codes.
 * Business-logic depth lives in appointments.service.test.ts.
 */
import '../../../test/setupDb';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import {
    createAppointment as seedAppointment,
    createDoctor,
    createPatient,
} from '../../../test/factories';
import { signToken } from '../../utils';

vi.mock('../email', () => ({
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    sendAppointmentConfirmation: vi.fn().mockResolvedValue(undefined),
    sendAppointmentDeclined: vi.fn().mockResolvedValue(undefined),
}));

import { app } from '../../app';

const futureISO = (minutesAhead = 60) => new Date(Date.now() + minutesAhead * 60_000).toISOString();

const bearer = (userId: string, role: 'PATIENT' | 'DOCTOR' | 'ADMIN', tv = 0) =>
    `Bearer ${signToken({ sub: userId, role, tv })}`;

// ─── POST /appointments ───────────────────────────────────────────────────────

describe('POST /api/v1/appointments', () => {
    it('returns 401 without an Authorization header', async () => {
        const res = await request(app)
            .post('/api/v1/appointments')
            .send({ doctorId: '00000000-0000-0000-0000-000000000000', scheduledAt: futureISO() });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when a DOCTOR tries to book', async () => {
        const doctor = await createDoctor();

        const res = await request(app)
            .post('/api/v1/appointments')
            .set('Authorization', bearer(doctor.userId, 'DOCTOR'))
            .send({
                doctorId: doctor.doctorId,
                scheduledAt: futureISO(),
                durationMinutes: 30,
            });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 400 VALIDATION_ERROR on missing doctorId', async () => {
        const patient = await createPatient();

        const res = await request(app)
            .post('/api/v1/appointments')
            .set('Authorization', bearer(patient.userId, 'PATIENT'))
            .send({ scheduledAt: futureISO(), durationMinutes: 30 });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 201 with appointment shape on success', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();

        const res = await request(app)
            .post('/api/v1/appointments')
            .set('Authorization', bearer(patient.userId, 'PATIENT'))
            .send({
                doctorId: doctor.doctorId,
                scheduledAt: futureISO(),
                durationMinutes: 30,
                reason: 'Follow-up',
            });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            doctorId: doctor.doctorId,
            status: 'PENDING',
            reason: 'Follow-up',
        });
    });

    it('returns 409 when the slot is taken', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const slot = futureISO();

        await request(app)
            .post('/api/v1/appointments')
            .set('Authorization', bearer(patient.userId, 'PATIENT'))
            .send({ doctorId: doctor.doctorId, scheduledAt: slot, durationMinutes: 30 });

        const patient2 = await createPatient();
        const res = await request(app)
            .post('/api/v1/appointments')
            .set('Authorization', bearer(patient2.userId, 'PATIENT'))
            .send({ doctorId: doctor.doctorId, scheduledAt: slot, durationMinutes: 30 });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
    });
});

// ─── GET /appointments ────────────────────────────────────────────────────────

describe('GET /api/v1/appointments', () => {
    it('returns 401 without an Authorization header', async () => {
        const res = await request(app).get('/api/v1/appointments');
        expect(res.status).toBe(401);
    });

    it('returns paginated results for a patient (scoped to their appointments)', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .get('/api/v1/appointments?page=1&limit=10')
            .set('Authorization', bearer(patient.userId, 'PATIENT'));

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            page: 1,
            limit: 10,
            total: 1,
        });
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});

// ─── GET /appointments/:id ────────────────────────────────────────────────────

describe('GET /api/v1/appointments/:appointmentId', () => {
    it('returns 200 to the appointment patient', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .get(`/api/v1/appointments/${appt.id}`)
            .set('Authorization', bearer(patient.userId, 'PATIENT'));

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(appt.id);
    });

    it('returns 403 to an unrelated user', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const stranger = await createPatient();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .get(`/api/v1/appointments/${appt.id}`)
            .set('Authorization', bearer(stranger.userId, 'PATIENT'));

        expect(res.status).toBe(403);
    });

    it('returns 400 on a non-UUID id', async () => {
        const patient = await createPatient();

        const res = await request(app)
            .get('/api/v1/appointments/not-a-uuid')
            .set('Authorization', bearer(patient.userId, 'PATIENT'));

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});

// ─── PATCH /appointments/:id/cancel ───────────────────────────────────────────

describe('PATCH /api/v1/appointments/:appointmentId/cancel', () => {
    it('lets the patient cancel their own appointment', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .patch(`/api/v1/appointments/${appt.id}/cancel`)
            .set('Authorization', bearer(patient.userId, 'PATIENT'));

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('CANCELLED_BY_PATIENT');
    });

    it('rejects a stranger with 403', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const stranger = await createPatient();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .patch(`/api/v1/appointments/${appt.id}/cancel`)
            .set('Authorization', bearer(stranger.userId, 'PATIENT'));

        expect(res.status).toBe(403);
    });
});

// ─── PATCH /appointments/:id/status (doctor confirm/decline) ──────────────────

describe('PATCH /api/v1/appointments/:appointmentId/status', () => {
    it('returns 403 when a PATIENT tries to confirm', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .patch(`/api/v1/appointments/${appt.id}/status`)
            .set('Authorization', bearer(patient.userId, 'PATIENT'))
            .send({ status: 'CONFIRMED' });

        expect(res.status).toBe(403);
    });

    it('lets the appointment doctor confirm', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .patch(`/api/v1/appointments/${appt.id}/status`)
            .set('Authorization', bearer(doctor.userId, 'DOCTOR'))
            .send({ status: 'CONFIRMED' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('CONFIRMED');
    });

    it('returns 400 VALIDATION_ERROR when declining without a reason', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .patch(`/api/v1/appointments/${appt.id}/status`)
            .set('Authorization', bearer(doctor.userId, 'DOCTOR'))
            .send({ status: 'CANCELLED_BY_DOCTOR' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});

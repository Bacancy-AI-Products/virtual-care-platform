/**
 * Route integration tests for /api/v1/prescriptions via supertest.
 *
 * Note: the `POST /appointments/:id/prescriptions` route lives on the
 * appointments router (with a doctor role guard at the HTTP layer). Tests
 * for that route are in this file too, since the surface under test is
 * the prescription contract.
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
import { createPrescription } from './prescriptions.service';

vi.mock('../email', () => ({
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    sendAppointmentConfirmation: vi.fn().mockResolvedValue(undefined),
    sendAppointmentDeclined: vi.fn().mockResolvedValue(undefined),
}));

import { app } from '../../app';

const bearer = (userId: string, role: 'PATIENT' | 'DOCTOR' | 'ADMIN', tv = 0) =>
    `Bearer ${signToken({ sub: userId, role, tv })}`;

const itemA = { drugName: 'Amoxicillin', dosage: '500mg', frequency: '3x daily' };

// ─── POST /appointments/:appointmentId/prescriptions ──────────────────────────

describe('POST /api/v1/appointments/:appointmentId/prescriptions', () => {
    it('returns 401 without an Authorization header', async () => {
        const res = await request(app)
            .post('/api/v1/appointments/00000000-0000-0000-0000-000000000000/prescriptions')
            .send({ items: [itemA] });

        expect(res.status).toBe(401);
    });

    it('returns 403 when a PATIENT tries to create', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .post(`/api/v1/appointments/${appt.id}/prescriptions`)
            .set('Authorization', bearer(patient.userId, 'PATIENT'))
            .send({ items: [itemA] });

        expect(res.status).toBe(403);
    });

    it('returns 400 VALIDATION_ERROR when items array is empty', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .post(`/api/v1/appointments/${appt.id}/prescriptions`)
            .set('Authorization', bearer(doctor.userId, 'DOCTOR'))
            .send({ items: [] });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 201 with prescription when the appointment doctor creates', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .post(`/api/v1/appointments/${appt.id}/prescriptions`)
            .set('Authorization', bearer(doctor.userId, 'DOCTOR'))
            .send({ notes: 'Take after meals', items: [itemA] });

        expect(res.status).toBe(201);
        expect(res.body.appointmentId).toBe(appt.id);
        expect(res.body.items).toHaveLength(1);
    });

    it('returns 403 when a different doctor (not the appointment owner) tries', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const otherDoctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const res = await request(app)
            .post(`/api/v1/appointments/${appt.id}/prescriptions`)
            .set('Authorization', bearer(otherDoctor.userId, 'DOCTOR'))
            .send({ items: [itemA] });

        expect(res.status).toBe(403);
    });
});

// ─── GET /prescriptions/mine ──────────────────────────────────────────────────

describe('GET /api/v1/prescriptions/mine', () => {
    it('returns 401 without an Authorization header', async () => {
        const res = await request(app).get('/api/v1/prescriptions/mine');
        expect(res.status).toBe(401);
    });

    it("returns the patient's prescriptions when role is PATIENT", async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);
        await createPrescription(appt.id, doctor.userId, 'DOCTOR', { items: [itemA] });

        const res = await request(app)
            .get('/api/v1/prescriptions/mine')
            .set('Authorization', bearer(patient.userId, 'PATIENT'));

        expect(res.status).toBe(200);
        expect(res.body.prescriptions).toHaveLength(1);
    });
});

// ─── GET /prescriptions/:id ───────────────────────────────────────────────────

describe('GET /api/v1/prescriptions/:id', () => {
    it('returns 200 to the prescription patient', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);
        const created = await createPrescription(appt.id, doctor.userId, 'DOCTOR', {
            items: [itemA],
        });

        const res = await request(app)
            .get(`/api/v1/prescriptions/${created.id}`)
            .set('Authorization', bearer(patient.userId, 'PATIENT'));

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(created.id);
    });

    it('returns 403 to an unrelated user', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const stranger = await createPatient();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);
        const created = await createPrescription(appt.id, doctor.userId, 'DOCTOR', {
            items: [itemA],
        });

        const res = await request(app)
            .get(`/api/v1/prescriptions/${created.id}`)
            .set('Authorization', bearer(stranger.userId, 'PATIENT'));

        expect(res.status).toBe(403);
    });

    it('returns 400 on a non-UUID id', async () => {
        const patient = await createPatient();

        const res = await request(app)
            .get('/api/v1/prescriptions/not-a-uuid')
            .set('Authorization', bearer(patient.userId, 'PATIENT'));

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});

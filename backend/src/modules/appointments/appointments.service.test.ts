/**
 * Service-layer tests for appointments. Real DB, real Prisma.
 * Email and Socket.io are not invoked from the service layer (the route invokes them),
 * so nothing here needs mocking.
 */
import '../../../test/setupDb';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../db';
import {
    cancelAppointment,
    createAppointment,
    getAppointment,
    listAppointments,
    updateStatus,
} from './appointments.service';
import {
    createAppointment as seedAppointment,
    createDoctor,
    createPatient,
} from '../../../test/factories';

const futureISO = (minutesAhead = 60) => new Date(Date.now() + minutesAhead * 60_000).toISOString();

// ─── createAppointment ────────────────────────────────────────────────────────

describe('createAppointment', () => {
    it('books a PENDING appointment when no conflict exists', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();

        const result = await createAppointment(patient.userId, {
            doctorId: doctor.doctorId,
            scheduledAt: futureISO(),
            durationMinutes: 30,
            reason: 'Routine check-up',
        });

        expect(result.status).toBe('PENDING');
        expect(result.patientId).toBeDefined();
        expect(result.doctorId).toBe(doctor.doctorId);
        expect(result.doctorUserId).toBe(doctor.userId);
    });

    it('rejects with 404 when patient profile is missing', async () => {
        const doctor = await createDoctor();
        // Use an orphan user (no patient row) — admin role for instance
        const orphan = await prisma.user.create({
            data: {
                name: 'Admin',
                email: `admin-${Date.now()}@telecare.local`,
                passwordHash: 'x',
                role: 'ADMIN',
            },
        });

        await expect(
            createAppointment(orphan.id, {
                doctorId: doctor.doctorId,
                scheduledAt: futureISO(),
                durationMinutes: 30,
            }),
        ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    it('rejects with 404 when the doctor is inactive', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor({ isActive: false });

        await expect(
            createAppointment(patient.userId, {
                doctorId: doctor.doctorId,
                scheduledAt: futureISO(),
                durationMinutes: 30,
            }),
        ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    it('rejects with 409 on overlapping PENDING/CONFIRMED appointment for the same doctor', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const slot = futureISO();

        await createAppointment(patient.userId, {
            doctorId: doctor.doctorId,
            scheduledAt: slot,
            durationMinutes: 30,
        });

        // Second patient tries the same slot
        const patient2 = await createPatient();
        await expect(
            createAppointment(patient2.userId, {
                doctorId: doctor.doctorId,
                scheduledAt: slot,
                durationMinutes: 30,
            }),
        ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
    });

    it('allows booking after a cancelled appointment in the same slot', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const slot = futureISO();

        const first = await createAppointment(patient.userId, {
            doctorId: doctor.doctorId,
            scheduledAt: slot,
            durationMinutes: 30,
        });
        // Cancel it
        await prisma.appointment.update({
            where: { id: first.id },
            data: { status: 'CANCELLED_BY_PATIENT' },
        });

        const second = await createAppointment(patient.userId, {
            doctorId: doctor.doctorId,
            scheduledAt: slot,
            durationMinutes: 30,
        });
        expect(second.status).toBe('PENDING');
    });
});

// ─── listAppointments (role-based visibility) ─────────────────────────────────

describe('listAppointments', () => {
    it('scopes results to a PATIENT user — they see only their own', async () => {
        const patientA = await createPatient();
        const patientB = await createPatient();
        const doctor = await createDoctor();

        await seedAppointment(patientA.patientId, doctor.doctorId);
        await seedAppointment(patientB.patientId, doctor.doctorId);

        const result = await listAppointments(patientA.userId, 'PATIENT', { page: 1, limit: 20 });

        expect(result.data).toHaveLength(1);
        expect(result.total).toBe(1);
    });

    it('scopes results to a DOCTOR user — they see only their own', async () => {
        const patient = await createPatient();
        const doctorA = await createDoctor();
        const doctorB = await createDoctor();

        await seedAppointment(patient.patientId, doctorA.doctorId);
        await seedAppointment(patient.patientId, doctorB.doctorId);

        const result = await listAppointments(doctorA.userId, 'DOCTOR', { page: 1, limit: 20 });

        expect(result.data).toHaveLength(1);
    });

    it('filters by status when provided', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        await seedAppointment(patient.patientId, doctor.doctorId, { status: 'PENDING' });
        await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'COMPLETED',
            scheduledAt: new Date(Date.now() + 2 * 60 * 60_000),
        });

        const result = await listAppointments(patient.userId, 'PATIENT', {
            status: 'PENDING',
            page: 1,
            limit: 20,
        });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].status).toBe('PENDING');
    });
});

// ─── getAppointment (visibility) ──────────────────────────────────────────────

describe('getAppointment', () => {
    it('lets the appointment patient view it', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const result = await getAppointment(appt.id, patient.userId, 'PATIENT');
        expect(result.id).toBe(appt.id);
    });

    it('lets the appointment doctor view it', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const result = await getAppointment(appt.id, doctor.userId, 'DOCTOR');
        expect(result.id).toBe(appt.id);
    });

    it('rejects an unrelated patient with 403', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const otherPatient = await createPatient();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        await expect(getAppointment(appt.id, otherPatient.userId, 'PATIENT')).rejects.toMatchObject(
            {
                status: 403,
                code: 'FORBIDDEN',
            },
        );
    });

    it('returns 404 for an unknown appointment id', async () => {
        const patient = await createPatient();
        await expect(
            getAppointment('00000000-0000-0000-0000-000000000000', patient.userId, 'PATIENT'),
        ).rejects.toMatchObject({ status: 404 });
    });
});

// ─── cancelAppointment ────────────────────────────────────────────────────────

describe('cancelAppointment', () => {
    it('marks status CANCELLED_BY_PATIENT when the patient cancels', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const result = await cancelAppointment(appt.id, patient.userId, 'PATIENT');
        expect(result.status).toBe('CANCELLED_BY_PATIENT');
    });

    it('marks status CANCELLED_BY_DOCTOR when the doctor cancels', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const result = await cancelAppointment(appt.id, doctor.userId, 'DOCTOR');
        expect(result.status).toBe('CANCELLED_BY_DOCTOR');
    });

    it('rejects a third-party caller with 403', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const stranger = await createPatient();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        await expect(cancelAppointment(appt.id, stranger.userId, 'PATIENT')).rejects.toMatchObject({
            status: 403,
        });
    });

    it('rejects cancelling an already-completed appointment with 400', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'COMPLETED',
        });

        await expect(cancelAppointment(appt.id, patient.userId, 'PATIENT')).rejects.toMatchObject({
            status: 400,
        });
    });
});

// ─── updateStatus (doctor confirm/decline) ────────────────────────────────────

describe('updateStatus', () => {
    it('lets the appointment doctor confirm a PENDING appointment', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const result = await updateStatus(appt.id, doctor.userId, 'DOCTOR', 'CONFIRMED');

        expect(result.status).toBe('CONFIRMED');
        expect(result.patientUserId).toBe(patient.userId);
    });

    it('lets the appointment doctor decline with a reason', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const result = await updateStatus(
            appt.id,
            doctor.userId,
            'DOCTOR',
            'CANCELLED_BY_DOCTOR',
            'Conflicting commitment',
        );

        expect(result.status).toBe('CANCELLED_BY_DOCTOR');
        expect(result.declineReason).toBe('Conflicting commitment');
    });

    it('rejects a non-doctor with 403', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        await expect(
            updateStatus(appt.id, patient.userId, 'PATIENT', 'CONFIRMED'),
        ).rejects.toMatchObject({ status: 403 });
    });

    it('rejects a different doctor (not the appointment owner) with 403', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const otherDoctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        await expect(
            updateStatus(appt.id, otherDoctor.userId, 'DOCTOR', 'CONFIRMED'),
        ).rejects.toMatchObject({ status: 403 });
    });
});

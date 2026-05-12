/**
 * Service-layer tests for prescriptions. Real DB, real Prisma.
 *
 * Permission model is the high-risk surface here: only the appointment's
 * doctor can write, only its doctor or patient (or admin) can read.
 */
import '../../../test/setupDb';
import { describe, expect, it } from 'vitest';
import {
    createAppointment as seedAppointment,
    createDoctor,
    createPatient,
} from '../../../test/factories';
import {
    createPrescription,
    getById,
    listByAppointment,
    listForUser,
} from './prescriptions.service';

const itemA = { drugName: 'Amoxicillin', dosage: '500mg', frequency: '3x daily' };
const itemB = { drugName: 'Ibuprofen', dosage: '200mg' };

// ─── createPrescription ───────────────────────────────────────────────────────

describe('createPrescription', () => {
    it('lets the appointment doctor create a prescription', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        const result = await createPrescription(appt.id, doctor.userId, 'DOCTOR', {
            notes: 'Take after meals',
            items: [itemA, itemB],
        });

        expect(result.appointmentId).toBe(appt.id);
        expect(result.doctorId).toBe(doctor.doctorId);
        expect(result.patientId).toBe(patient.patientId);
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toMatchObject({ drugName: 'Amoxicillin' });
    });

    it('rejects non-doctors with 403', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        await expect(
            createPrescription(appt.id, patient.userId, 'PATIENT', { items: [itemA] }),
        ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('rejects a doctor who is not the appointment owner with 403', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const otherDoctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        await expect(
            createPrescription(appt.id, otherDoctor.userId, 'DOCTOR', { items: [itemA] }),
        ).rejects.toMatchObject({ status: 403 });
    });

    it('returns 404 for an unknown appointment id', async () => {
        const doctor = await createDoctor();

        await expect(
            createPrescription('00000000-0000-0000-0000-000000000000', doctor.userId, 'DOCTOR', {
                items: [itemA],
            }),
        ).rejects.toMatchObject({ status: 404 });
    });
});

// ─── listByAppointment ────────────────────────────────────────────────────────

describe('listByAppointment', () => {
    it('returns prescriptions for the appointment doctor', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);
        await createPrescription(appt.id, doctor.userId, 'DOCTOR', { items: [itemA] });

        const result = await listByAppointment(appt.id, doctor.userId, 'DOCTOR');
        expect(result.prescriptions).toHaveLength(1);
    });

    it('returns prescriptions for the appointment patient', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);
        await createPrescription(appt.id, doctor.userId, 'DOCTOR', { items: [itemA] });

        const result = await listByAppointment(appt.id, patient.userId, 'PATIENT');
        expect(result.prescriptions).toHaveLength(1);
    });

    it('rejects a stranger with 403', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const stranger = await createPatient();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);

        await expect(listByAppointment(appt.id, stranger.userId, 'PATIENT')).rejects.toMatchObject({
            status: 403,
        });
    });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('getById', () => {
    it('returns the prescription to the patient on it', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);
        const created = await createPrescription(appt.id, doctor.userId, 'DOCTOR', {
            items: [itemA],
        });

        const result = await getById(created.id, patient.userId, 'PATIENT');
        expect(result.id).toBe(created.id);
    });

    it('rejects an unrelated patient with 403', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const stranger = await createPatient();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId);
        const created = await createPrescription(appt.id, doctor.userId, 'DOCTOR', {
            items: [itemA],
        });

        await expect(getById(created.id, stranger.userId, 'PATIENT')).rejects.toMatchObject({
            status: 403,
        });
    });

    it('returns 404 for an unknown prescription id', async () => {
        const patient = await createPatient();
        await expect(
            getById('00000000-0000-0000-0000-000000000000', patient.userId, 'PATIENT'),
        ).rejects.toMatchObject({ status: 404 });
    });
});

// ─── listForUser ──────────────────────────────────────────────────────────────

describe('listForUser', () => {
    it("returns only the doctor's own prescriptions when role is DOCTOR", async () => {
        const patient = await createPatient();
        const doctorA = await createDoctor();
        const doctorB = await createDoctor();

        const apptA = await seedAppointment(patient.patientId, doctorA.doctorId);
        const apptB = await seedAppointment(patient.patientId, doctorB.doctorId, {
            scheduledAt: new Date(Date.now() + 2 * 60 * 60_000),
        });
        await createPrescription(apptA.id, doctorA.userId, 'DOCTOR', { items: [itemA] });
        await createPrescription(apptB.id, doctorB.userId, 'DOCTOR', { items: [itemA] });

        const result = await listForUser(doctorA.userId, 'DOCTOR', { limit: 50 });
        expect(result.prescriptions).toHaveLength(1);
        expect(result.prescriptions[0].doctorId).toBe(doctorA.doctorId);
    });

    it("returns only the patient's own prescriptions when role is PATIENT", async () => {
        const patientA = await createPatient();
        const patientB = await createPatient();
        const doctor = await createDoctor();

        const apptA = await seedAppointment(patientA.patientId, doctor.doctorId);
        const apptB = await seedAppointment(patientB.patientId, doctor.doctorId, {
            scheduledAt: new Date(Date.now() + 2 * 60 * 60_000),
        });
        await createPrescription(apptA.id, doctor.userId, 'DOCTOR', { items: [itemA] });
        await createPrescription(apptB.id, doctor.userId, 'DOCTOR', { items: [itemA] });

        const result = await listForUser(patientA.userId, 'PATIENT', { limit: 50 });
        expect(result.prescriptions).toHaveLength(1);
    });

    it('respects the limit parameter', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();

        // Create 3 appointments, each with one prescription
        for (let i = 0; i < 3; i++) {
            const appt = await seedAppointment(patient.patientId, doctor.doctorId, {
                scheduledAt: new Date(Date.now() + (i + 1) * 60 * 60_000),
            });
            await createPrescription(appt.id, doctor.userId, 'DOCTOR', { items: [itemA] });
        }

        const result = await listForUser(patient.userId, 'PATIENT', { limit: 2 });
        expect(result.prescriptions).toHaveLength(2);
    });
});

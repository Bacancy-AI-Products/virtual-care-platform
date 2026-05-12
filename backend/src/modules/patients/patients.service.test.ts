/**
 * Service-layer tests for patients.
 *
 * Highest-risk surface: cross-patient access by doctors. A doctor must have
 * had an appointment with a patient to view their evaluation data.
 */
import '../../../test/setupDb';
import { describe, expect, it } from 'vitest';
import {
    createAppointment as seedAppointment,
    createDoctor,
    createPatient,
} from '../../../test/factories';
import { getPatientForDoctor, updateMyProfile } from './patients.service';

// ─── updateMyProfile ──────────────────────────────────────────────────────────

describe('patients.updateMyProfile', () => {
    it('updates only the fields passed', async () => {
        const patient = await createPatient();

        const result = await updateMyProfile(patient.userId, {
            phone: '+1-555-0100',
            bloodGroup: 'O+',
        });

        expect(result.phone).toBe('+1-555-0100');
        expect(result.bloodGroup).toBe('O+');
    });

    it('accepts null to clear nullable fields', async () => {
        const patient = await createPatient();
        await updateMyProfile(patient.userId, { phone: '+1-555-0100' });
        const cleared = await updateMyProfile(patient.userId, { phone: null });
        expect(cleared.phone).toBeNull();
    });

    it('throws 404 when the user has no patient profile', async () => {
        const doctor = await createDoctor();
        await expect(updateMyProfile(doctor.userId, { phone: '+1' })).rejects.toMatchObject({
            status: 404,
        });
    });
});

// ─── getPatientForDoctor ──────────────────────────────────────────────────────

describe('getPatientForDoctor', () => {
    it('lets a doctor view a patient they have an appointment with', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        await seedAppointment(patient.patientId, doctor.doctorId);

        const result = await getPatientForDoctor(patient.patientId, doctor.userId);

        expect(result.id).toBe(patient.patientId);
    });

    it('rejects a doctor with no appointment with that patient (403)', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        // No appointment seeded

        await expect(getPatientForDoctor(patient.patientId, doctor.userId)).rejects.toMatchObject({
            status: 403,
            code: 'FORBIDDEN',
        });
    });

    it('throws 404 when caller has no doctor profile', async () => {
        const patient = await createPatient();
        const otherPatient = await createPatient(); // userId without doctorProfile

        await expect(
            getPatientForDoctor(patient.patientId, otherPatient.userId),
        ).rejects.toMatchObject({ status: 404 });
    });
});

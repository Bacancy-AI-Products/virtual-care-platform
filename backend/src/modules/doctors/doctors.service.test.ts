/**
 * Service-layer tests for doctors. Real DB, real Prisma.
 *
 * Surface tested:
 *   - listDoctors: filters, search across name/bio/specialization, isActive guard
 *   - getDoctorById: 404
 *   - profile updates: only-passed-fields, 404 when no profile
 *   - availability: get + replace via transaction
 *   - stats aggregation: ratings + completed counts
 */
import '../../../test/setupDb';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../db';
import {
    createAppointment as seedAppointment,
    createDoctor,
    createPatient,
    createReview,
} from '../../../test/factories';
import {
    getAvailability,
    getDoctorById,
    getMyAvailability,
    getMyProfile,
    listDoctors,
    listSpecializations,
    updateMyAvailability,
    updateMyProfile,
} from './doctors.service';

// ─── listDoctors ──────────────────────────────────────────────────────────────

describe('listDoctors', () => {
    it('returns active doctors with pagination metadata', async () => {
        await createDoctor({ specialization: 'Cardiology' });
        await createDoctor({ specialization: 'Dermatology' });

        const result = await listDoctors({ page: 1, limit: 10 });

        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
        expect(result.data).toHaveLength(2);
    });

    it('excludes deactivated doctors', async () => {
        await createDoctor();
        await createDoctor({ isActive: false });

        const result = await listDoctors({ page: 1, limit: 10 });

        expect(result.total).toBe(1);
    });

    it('filters by specialization (case-insensitive contains)', async () => {
        await createDoctor({ specialization: 'Cardiology' });
        await createDoctor({ specialization: 'Pediatrics' });

        const result = await listDoctors({ specialization: 'card', page: 1, limit: 10 });

        expect(result.total).toBe(1);
        expect(result.data[0].specialization).toBe('Cardiology');
    });

    it('filters by verified flag', async () => {
        const verified = await createDoctor();
        await prisma.doctorProfile.update({
            where: { id: verified.doctorId },
            data: { verified: true },
        });
        await createDoctor(); // verified=false (default)

        const result = await listDoctors({ verified: true, page: 1, limit: 10 });

        expect(result.total).toBe(1);
    });

    it('matches search query against doctor name', async () => {
        await createDoctor({ name: 'Dr. Banner' });
        await createDoctor({ name: 'Dr. Strange' });

        const result = await listDoctors({ q: 'banner', page: 1, limit: 10 });

        expect(result.total).toBe(1);
        expect(result.data[0].user.name).toBe('Dr. Banner');
    });

    it('attaches stats (rating, reviewCount, consultationCount) to each result', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'COMPLETED',
        });
        await createReview(patient.patientId, doctor.doctorId, appt.id, { rating: 5 });

        const result = await listDoctors({ page: 1, limit: 10 });

        const d = result.data.find((x) => x.id === doctor.doctorId);
        expect(d?.stats.reviewCount).toBe(1);
        expect(Number(d?.stats.averageRating)).toBe(5);
        expect(d?.stats.consultationCount).toBe(1);
    });
});

// ─── getDoctorById ────────────────────────────────────────────────────────────

describe('getDoctorById', () => {
    it('returns doctor with stats by id', async () => {
        const doctor = await createDoctor({ specialization: 'Cardiology' });

        const result = await getDoctorById(doctor.doctorId);

        expect(result.id).toBe(doctor.doctorId);
        expect(result.specialization).toBe('Cardiology');
        expect(result.stats).toBeDefined();
    });

    it('throws 404 for an unknown id', async () => {
        await expect(getDoctorById('00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({
            status: 404,
            code: 'NOT_FOUND',
        });
    });
});

// ─── getMyProfile + updateMyProfile ───────────────────────────────────────────

describe('getMyProfile', () => {
    it('returns the doctor profile for the caller', async () => {
        const doctor = await createDoctor({ specialization: 'Cardiology' });
        const result = await getMyProfile(doctor.userId);
        expect(result.id).toBe(doctor.doctorId);
        expect(result.specialization).toBe('Cardiology');
    });

    it('throws 404 when the user has no doctor profile', async () => {
        const patient = await createPatient();
        await expect(getMyProfile(patient.userId)).rejects.toMatchObject({ status: 404 });
    });
});

describe('updateMyProfile', () => {
    it('updates only the fields passed', async () => {
        const doctor = await createDoctor({ specialization: 'General Medicine' });

        const result = await updateMyProfile(doctor.userId, {
            specialization: 'Cardiology',
            experienceYears: 10,
        });

        expect(result.specialization).toBe('Cardiology');
        expect(result.experienceYears).toBe(10);

        // bio not passed — remains unset
        expect(result.bio).toBeNull();
    });

    it('accepts null to clear a nullable field', async () => {
        const doctor = await createDoctor();
        await updateMyProfile(doctor.userId, { bio: 'Initial bio' });
        const cleared = await updateMyProfile(doctor.userId, { bio: null });
        expect(cleared.bio).toBeNull();
    });

    it('throws 404 when the user has no doctor profile', async () => {
        const patient = await createPatient();
        await expect(updateMyProfile(patient.userId, { bio: 'x' })).rejects.toMatchObject({
            status: 404,
        });
    });
});

// ─── availability ─────────────────────────────────────────────────────────────

describe('updateMyAvailability + getAvailability', () => {
    it('replaces all availability slots in a single transaction', async () => {
        const doctor = await createDoctor();

        const r1 = await updateMyAvailability(doctor.userId, {
            availability: [
                { weekday: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
                { weekday: 2, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
            ],
        });
        expect(r1.availability).toHaveLength(2);

        // Replace with one slot — the old two should be gone
        const r2 = await updateMyAvailability(doctor.userId, {
            availability: [{ weekday: 3, startTime: '10:00', endTime: '14:00', slotDuration: 30 }],
        });
        expect(r2.availability).toHaveLength(1);
        expect(r2.availability[0].weekday).toBe(3);
    });

    it('returns booked appointments when from/to window is provided', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const futureStart = new Date(Date.now() + 60 * 60_000);
        await seedAppointment(patient.patientId, doctor.doctorId, {
            scheduledAt: futureStart,
            status: 'CONFIRMED',
        });

        const result = await getAvailability(doctor.doctorId, {
            from: new Date(Date.now()).toISOString(),
            to: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
        });

        expect(result.bookedAppointments).toHaveLength(1);
    });

    it('returns empty bookedAppointments when no window is given', async () => {
        const doctor = await createDoctor();
        const result = await getAvailability(doctor.doctorId);
        expect(result.bookedAppointments).toEqual([]);
    });

    it('getMyAvailability throws 404 for non-doctor users', async () => {
        const patient = await createPatient();
        await expect(getMyAvailability(patient.userId)).rejects.toMatchObject({ status: 404 });
    });
});

// ─── listSpecializations ──────────────────────────────────────────────────────

describe('listSpecializations', () => {
    it('returns all specializations sorted alphabetically', async () => {
        await prisma.specialization.createMany({
            data: [
                { id: 'cardio', name: 'Cardiology' },
                { id: 'derm', name: 'Dermatology' },
                { id: 'gen', name: 'General Medicine' },
            ],
        });

        const result = await listSpecializations();

        expect(result.map((s) => s.name)).toEqual([
            'Cardiology',
            'Dermatology',
            'General Medicine',
        ]);
    });
});

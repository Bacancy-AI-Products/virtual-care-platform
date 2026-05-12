/**
 * Service-layer tests for reviews.
 *
 * Key rules under test:
 *   - only the appointment patient can review
 *   - only COMPLETED appointments can be reviewed
 *   - one review per appointment (idempotency)
 *   - summary aggregates rating distribution + average
 */
import '../../../test/setupDb';
import { describe, expect, it } from 'vitest';
import {
    createAppointment as seedAppointment,
    createDoctor,
    createPatient,
    createReview,
} from '../../../test/factories';
import {
    createReviewForAppointment,
    getDoctorReviewsSummary,
    getReviewForAppointmentByPatient,
    listDoctorReviews,
    listReviewsByPatientUserId,
} from './reviews.service';

// ─── createReviewForAppointment ───────────────────────────────────────────────

describe('createReviewForAppointment', () => {
    it('creates a review when caller is the patient and appointment is COMPLETED', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'COMPLETED',
        });

        const result = await createReviewForAppointment(appt.id, patient.userId, {
            rating: 5,
            comment: 'Excellent',
        });

        expect(result.rating).toBe(5);
        expect(result.comment).toBe('Excellent');
        expect(result.patient.name).toBe(patient.name);
    });

    it('rejects when caller is not the appointment patient (403)', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const stranger = await createPatient();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'COMPLETED',
        });

        await expect(
            createReviewForAppointment(appt.id, stranger.userId, { rating: 5 }),
        ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('rejects when appointment is not COMPLETED (400)', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'PENDING',
        });

        await expect(
            createReviewForAppointment(appt.id, patient.userId, { rating: 5 }),
        ).rejects.toMatchObject({ status: 400, code: 'INVALID_APPOINTMENT_STATUS' });
    });

    it('rejects a duplicate review with 409 ALREADY_REVIEWED', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'COMPLETED',
        });
        await createReviewForAppointment(appt.id, patient.userId, { rating: 5 });

        await expect(
            createReviewForAppointment(appt.id, patient.userId, { rating: 4 }),
        ).rejects.toMatchObject({ status: 409, code: 'ALREADY_REVIEWED' });
    });

    it('returns 404 for an unknown appointment id', async () => {
        const patient = await createPatient();
        await expect(
            createReviewForAppointment('00000000-0000-0000-0000-000000000000', patient.userId, {
                rating: 5,
            }),
        ).rejects.toMatchObject({ status: 404 });
    });
});

// ─── listDoctorReviews + getDoctorReviewsSummary ──────────────────────────────

describe('listDoctorReviews', () => {
    it('returns paginated reviews + a summary block', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'COMPLETED',
        });
        await createReview(patient.patientId, doctor.doctorId, appt.id, { rating: 4 });

        const result = await listDoctorReviews({ doctorId: doctor.doctorId, page: 1, limit: 10 });

        expect(result.total).toBe(1);
        expect(result.data[0].rating).toBe(4);
        expect(result.summary.reviewCount).toBe(1);
        expect(Number(result.summary.averageRating)).toBe(4);
    });

    it('throws 404 for an unknown doctor', async () => {
        await expect(
            listDoctorReviews({
                doctorId: '00000000-0000-0000-0000-000000000000',
                page: 1,
                limit: 10,
            }),
        ).rejects.toMatchObject({ status: 404 });
    });
});

describe('getDoctorReviewsSummary', () => {
    it('computes distribution by rating (1–5) and average', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appts = await Promise.all([
            seedAppointment(patient.patientId, doctor.doctorId, {
                status: 'COMPLETED',
                scheduledAt: new Date(Date.now() + 60 * 60_000),
            }),
            seedAppointment(patient.patientId, doctor.doctorId, {
                status: 'COMPLETED',
                scheduledAt: new Date(Date.now() + 2 * 60 * 60_000),
            }),
            seedAppointment(patient.patientId, doctor.doctorId, {
                status: 'COMPLETED',
                scheduledAt: new Date(Date.now() + 3 * 60 * 60_000),
            }),
        ]);
        await createReview(patient.patientId, doctor.doctorId, appts[0].id, { rating: 5 });
        await createReview(patient.patientId, doctor.doctorId, appts[1].id, { rating: 5 });
        await createReview(patient.patientId, doctor.doctorId, appts[2].id, { rating: 3 });

        const summary = await getDoctorReviewsSummary(doctor.doctorId);

        expect(summary.reviewCount).toBe(3);
        expect(Number(summary.averageRating)).toBeCloseTo(4.33, 1);
        expect(summary.distribution[5]).toBe(2);
        expect(summary.distribution[3]).toBe(1);
        expect(summary.distribution[1]).toBe(0);
    });

    it('returns zero summary for a doctor with no reviews', async () => {
        const doctor = await createDoctor();
        const summary = await getDoctorReviewsSummary(doctor.doctorId);
        expect(summary.reviewCount).toBe(0);
        expect(summary.averageRating).toBeNull();
        expect(summary.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });
});

// ─── getReviewForAppointmentByPatient ─────────────────────────────────────────

describe('getReviewForAppointmentByPatient', () => {
    it('returns the review when caller is the appointment patient', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'COMPLETED',
        });
        await createReview(patient.patientId, doctor.doctorId, appt.id);

        const result = await getReviewForAppointmentByPatient(appt.id, patient.userId);
        expect(result).not.toBeNull();
    });

    it('returns null (no error) when a stranger asks — anti-enumeration', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const stranger = await createPatient();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'COMPLETED',
        });
        await createReview(patient.patientId, doctor.doctorId, appt.id);

        const result = await getReviewForAppointmentByPatient(appt.id, stranger.userId);
        expect(result).toBeNull();
    });

    it('returns null when no review exists', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const appt = await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'COMPLETED',
        });
        const result = await getReviewForAppointmentByPatient(appt.id, patient.userId);
        expect(result).toBeNull();
    });
});

// ─── listReviewsByPatientUserId ───────────────────────────────────────────────

describe('listReviewsByPatientUserId', () => {
    it("returns the patient's own reviews, newest first", async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        const a1 = await seedAppointment(patient.patientId, doctor.doctorId, {
            status: 'COMPLETED',
            scheduledAt: new Date(Date.now() + 60 * 60_000),
        });
        await createReview(patient.patientId, doctor.doctorId, a1.id, { rating: 4 });

        const result = await listReviewsByPatientUserId(patient.userId, { page: 1, limit: 10 });

        expect(result.total).toBe(1);
        expect(result.data[0].rating).toBe(4);
    });

    it('returns empty for a user with no patient profile (e.g. an admin)', async () => {
        const doctor = await createDoctor();
        const result = await listReviewsByPatientUserId(doctor.userId, { page: 1, limit: 10 });
        expect(result.total).toBe(0);
        expect(result.data).toEqual([]);
    });
});

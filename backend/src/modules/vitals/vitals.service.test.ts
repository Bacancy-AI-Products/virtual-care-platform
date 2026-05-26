/**
 * Service-layer tests for vitals. Real DB, real Prisma.
 *
 * High-risk surfaces being verified:
 *   - status derivation (NORMAL / WARNING / CRITICAL) is correct per range.
 *   - role gating: only PATIENT can write / list own / delete; DOCTOR can read
 *     a patient only when they share an appointment.
 *   - delete only removes the patient's own row.
 */
import '../../../test/setupDb';
import { describe, expect, it } from 'vitest';
import { createAppointment, createDoctor, createPatient } from '../../../test/factories';
import {
    createReading,
    deleteReading,
    deriveStatus,
    getMyTrends,
    getTrendsForPatientByDoctor,
    listForMe,
    listForPatientByDoctor,
} from './vitals.service';

// ─── deriveStatus ─────────────────────────────────────────────────────────────

describe('deriveStatus', () => {
    it('classifies in-normal-range as NORMAL', () => {
        expect(deriveStatus('BP_SYSTOLIC', 120)).toBe('NORMAL');
        expect(deriveStatus('HEART_RATE', 75)).toBe('NORMAL');
        expect(deriveStatus('SPO2', 98)).toBe('NORMAL');
    });
    it('flags outside-normal-but-in-valid as WARNING', () => {
        expect(deriveStatus('BP_SYSTOLIC', 145)).toBe('WARNING'); // normal max is 139
        expect(deriveStatus('HEART_RATE', 110)).toBe('WARNING'); // normal max is 100
    });
    it('flags outside-valid as CRITICAL', () => {
        expect(deriveStatus('BP_SYSTOLIC', 30)).toBe('CRITICAL'); // valid min is 60
        expect(deriveStatus('HEART_RATE', 250)).toBe('CRITICAL'); // valid max is 220
        expect(deriveStatus('SPO2', 49)).toBe('CRITICAL'); // valid min is 50
    });
});

// ─── createReading ────────────────────────────────────────────────────────────

describe('createReading', () => {
    it('lets a patient log their own reading and derives status', async () => {
        const patient = await createPatient();
        const result = await createReading(patient.userId, 'PATIENT', {
            type: 'BP_SYSTOLIC',
            value: 128,
        });
        expect(result.patientId).toBe(patient.patientId);
        expect(result.type).toBe('BP_SYSTOLIC');
        expect(result.value).toBe(128);
        expect(result.unit).toBe('mmHg');
        expect(result.status).toBe('NORMAL');
        expect(result.entryMethod).toBe('MANUAL');
    });

    it('rejects a DOCTOR trying to log a vital', async () => {
        const doctor = await createDoctor();
        await expect(
            createReading(doctor.userId, 'DOCTOR', { type: 'HEART_RATE', value: 80 }),
        ).rejects.toThrow(/Only patients/);
    });

    it('rejects an implausible value outside 2× the valid range', async () => {
        const patient = await createPatient();
        await expect(
            createReading(patient.userId, 'PATIENT', { type: 'HEART_RATE', value: 9000 }),
        ).rejects.toThrow(/out of accepted range/);
    });
});

// ─── listForMe & listForPatientByDoctor ───────────────────────────────────────

describe('list endpoints', () => {
    it('returns only the patient own readings, newest first', async () => {
        const patient = await createPatient();
        await createReading(patient.userId, 'PATIENT', { type: 'BP_SYSTOLIC', value: 120 });
        await createReading(patient.userId, 'PATIENT', { type: 'WEIGHT', value: 72.5 });

        const out = await listForMe(patient.userId, 'PATIENT', { limit: 50, page: 1 });
        expect(out.data).toHaveLength(2);
        expect(out.pagination.total).toBe(2);
    });

    it('lets a doctor with an appointment read a patient vitals', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        await createAppointment(patient.patientId, doctor.doctorId);
        await createReading(patient.userId, 'PATIENT', { type: 'HEART_RATE', value: 72 });

        const out = await listForPatientByDoctor(doctor.userId, patient.patientId, {
            limit: 50,
            page: 1,
        });
        expect(out.data).toHaveLength(1);
        expect(out.data[0].type).toBe('HEART_RATE');
    });

    it('blocks a doctor with no appointment from reading vitals', async () => {
        const patient = await createPatient();
        const otherDoctor = await createDoctor();
        await createReading(patient.userId, 'PATIENT', { type: 'HEART_RATE', value: 72 });

        await expect(
            listForPatientByDoctor(otherDoctor.userId, patient.patientId, {
                limit: 50,
                page: 1,
            }),
        ).rejects.toThrow(/do not have access/);
    });
});

// ─── trends ───────────────────────────────────────────────────────────────────

describe('trends', () => {
    it('returns one entry per vital type with latest readings populated', async () => {
        const patient = await createPatient();
        await createReading(patient.userId, 'PATIENT', { type: 'BP_SYSTOLIC', value: 118 });
        await createReading(patient.userId, 'PATIENT', { type: 'BP_SYSTOLIC', value: 124 });
        await createReading(patient.userId, 'PATIENT', { type: 'WEIGHT', value: 70 });

        const out = await getMyTrends(patient.userId, 'PATIENT', { days: 30 });
        expect(out.series).toHaveLength(7); // one per supported VitalType

        const bp = out.series.find((s) => s.type === 'BP_SYSTOLIC');
        expect(bp?.points).toHaveLength(2);
        expect(bp?.latest?.value).toBe(124);

        const empty = out.series.find((s) => s.type === 'HEART_RATE');
        expect(empty?.points).toHaveLength(0);
        expect(empty?.latest).toBeNull();
    });

    it('doctor trends honour the appointment access rule', async () => {
        const patient = await createPatient();
        const doctor = await createDoctor();
        await createAppointment(patient.patientId, doctor.doctorId);
        await createReading(patient.userId, 'PATIENT', { type: 'HEART_RATE', value: 75 });

        const allowed = await getTrendsForPatientByDoctor(doctor.userId, patient.patientId, {
            days: 30,
        });
        expect(allowed.series.find((s) => s.type === 'HEART_RATE')?.points).toHaveLength(1);

        const stranger = await createDoctor();
        await expect(
            getTrendsForPatientByDoctor(stranger.userId, patient.patientId, { days: 30 }),
        ).rejects.toThrow(/do not have access/);
    });
});

// ─── deleteReading ────────────────────────────────────────────────────────────

describe('deleteReading', () => {
    it('lets the patient delete their own reading', async () => {
        const patient = await createPatient();
        const reading = await createReading(patient.userId, 'PATIENT', {
            type: 'WEIGHT',
            value: 70,
        });
        const result = await deleteReading(patient.userId, 'PATIENT', reading.id);
        expect(result.id).toBe(reading.id);

        const after = await listForMe(patient.userId, 'PATIENT', { limit: 50, page: 1 });
        expect(after.data).toHaveLength(0);
    });

    it('rejects deleting another patient reading', async () => {
        const p1 = await createPatient();
        const p2 = await createPatient();
        const reading = await createReading(p1.userId, 'PATIENT', {
            type: 'WEIGHT',
            value: 70,
        });
        await expect(deleteReading(p2.userId, 'PATIENT', reading.id)).rejects.toThrow(/not found/);
    });
});

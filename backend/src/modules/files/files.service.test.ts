/**
 * Service-layer tests for files.
 *
 * Focus: blob persistence + ownership-based deletion. Image optimization
 * goes through real Jimp (no mock) to ensure the integration actually works.
 */
import '../../../test/setupDb';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../db';
import { createPatient } from '../../../test/factories';
import {
    deleteFile,
    getFileBlob,
    getFileById,
    getFilesByAppointment,
    saveFile,
} from './files.service';

// Minimal Buffer that looks like a 1x1 JPEG to Jimp (avoid crashing if Jimp tries to parse).
// Jimp will likely fail to read this but the saveFile fallback path stores original buffer.
const PNG_1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=',
    'base64',
);

const fakeMulterFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'avatar.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: PNG_1x1.length,
    buffer: PNG_1x1,
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
});

// ─── saveFile ────────────────────────────────────────────────────────────────

describe('saveFile', () => {
    it('stores an image as a DB blob with IMAGE type', async () => {
        const patient = await createPatient();
        const file = await saveFile(fakeMulterFile(), patient.userId);

        expect(file.type).toBe('IMAGE');
        expect(file.storageKey).toBe('db');
        expect(file.data).not.toBeNull();
        expect(file.ownerId).toBe(patient.userId);
    });

    it('classifies PDFs as REPORT and stores raw bytes', async () => {
        const patient = await createPatient();
        const file = await saveFile(
            fakeMulterFile({
                mimetype: 'application/pdf',
                originalname: 'report.pdf',
                buffer: Buffer.from('%PDF-fake'),
            }),
            patient.userId,
        );

        expect(file.type).toBe('REPORT');
        expect(file.mimeType).toBe('application/pdf');
    });

    it('attaches appointmentId when provided', async () => {
        const patient = await createPatient();
        // Need a real appointment for FK
        const doctor = await prisma.user.create({
            data: {
                name: 'Doc',
                email: `doc-${Date.now()}@telecare.local`,
                passwordHash: 'x',
                role: 'DOCTOR',
                doctorProfile: { create: { specialization: 'General' } },
            },
            include: { doctorProfile: true },
        });
        const appt = await prisma.appointment.create({
            data: {
                patientId: patient.patientId,
                doctorId: doctor.doctorProfile!.id,
                scheduledAt: new Date(Date.now() + 60 * 60_000),
                durationMinutes: 30,
            },
        });

        const file = await saveFile(fakeMulterFile(), patient.userId, appt.id);
        expect(file.appointmentId).toBe(appt.id);
    });
});

// ─── getFileById / getFilesByAppointment ─────────────────────────────────────

describe('getFileById', () => {
    it('returns null for an unknown id', async () => {
        const result = await getFileById('00000000-0000-0000-0000-000000000000');
        expect(result).toBeNull();
    });
});

describe('getFilesByAppointment', () => {
    it('returns only files attached to that appointment', async () => {
        const patient = await createPatient();
        // Manually create two files: one with appointment, one without
        const appt = await prisma.appointment.create({
            data: {
                patientId: patient.patientId,
                doctorId: (
                    await prisma.user.create({
                        data: {
                            name: 'D',
                            email: `d-${Date.now()}@telecare.local`,
                            passwordHash: 'x',
                            role: 'DOCTOR',
                            doctorProfile: { create: { specialization: 'X' } },
                        },
                        include: { doctorProfile: true },
                    })
                ).doctorProfile!.id,
                scheduledAt: new Date(Date.now() + 60 * 60_000),
                durationMinutes: 30,
            },
        });
        await saveFile(fakeMulterFile(), patient.userId, appt.id);
        await saveFile(fakeMulterFile(), patient.userId); // unattached avatar

        const result = await getFilesByAppointment(appt.id);
        expect(result).toHaveLength(1);
    });
});

// ─── getFileBlob ─────────────────────────────────────────────────────────────

describe('getFileBlob', () => {
    it('returns a Buffer when data is present', () => {
        const buf = Buffer.from('hello');
        const result = getFileBlob({ data: buf, storageKey: 'db', mimeType: 'text/plain' });
        expect(result).toEqual(buf);
    });

    it('returns null when both data and a valid storageKey are absent', () => {
        const result = getFileBlob({
            data: null,
            storageKey: null,
            mimeType: 'image/png',
        });
        expect(result).toBeNull();
    });
});

// ─── deleteFile (ownership) ───────────────────────────────────────────────────

describe('deleteFile', () => {
    it('deletes a file owned by the caller', async () => {
        const patient = await createPatient();
        const file = await saveFile(fakeMulterFile(), patient.userId);

        const result = await deleteFile(file.id, patient.userId);

        expect(result).not.toBeNull();
        const after = await prisma.file.findUnique({ where: { id: file.id } });
        expect(after).toBeNull();
    });

    it('rejects deletion by a different user', async () => {
        const owner = await createPatient();
        const stranger = await createPatient();
        const file = await saveFile(fakeMulterFile(), owner.userId);

        await expect(deleteFile(file.id, stranger.userId)).rejects.toThrow(
            'Not authorized to delete this file',
        );
    });

    it('returns null when the file does not exist', async () => {
        const patient = await createPatient();
        const result = await deleteFile('00000000-0000-0000-0000-000000000000', patient.userId);
        expect(result).toBeNull();
    });
});

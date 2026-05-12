/**
 * Service-layer tests for users.
 *
 * getMe is the source of truth for "who am I + my role profile" on the
 * frontend. The shape it returns drives a lot of UI decisions.
 */
import '../../../test/setupDb';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../db';
import { createDoctor, createPatient } from '../../../test/factories';
import { getMe, updateAvatar } from './users.service';

// ─── getMe ────────────────────────────────────────────────────────────────────

describe('users.getMe', () => {
    it('includes doctorProfile for a DOCTOR user, not patient', async () => {
        const doctor = await createDoctor({ specialization: 'Cardiology' });

        const result = await getMe(doctor.userId);

        expect(result.role).toBe('DOCTOR');
        expect(result.doctorProfile).toBeDefined();
        expect(result.doctorProfile?.specialization).toBe('Cardiology');
        expect(result.patient).toBeUndefined();
    });

    it('includes patient profile for a PATIENT user, not doctor', async () => {
        const patient = await createPatient();

        const result = await getMe(patient.userId);

        expect(result.role).toBe('PATIENT');
        expect(result.patient).toBeDefined();
        expect(result.doctorProfile).toBeUndefined();
    });

    it('throws 404 for an unknown userId', async () => {
        await expect(getMe('00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({
            status: 404,
            code: 'NOT_FOUND',
        });
    });
});

// ─── updateAvatar ─────────────────────────────────────────────────────────────

describe('users.updateAvatar', () => {
    it('persists the avatar file id on the user row', async () => {
        const patient = await createPatient();
        // Insert a real File row so the FK is valid
        const file = await prisma.file.create({
            data: {
                ownerId: patient.userId,
                uploadedById: patient.userId,
                type: 'IMAGE',
                originalName: 'a.jpg',
                mimeType: 'image/jpeg',
                sizeBytes: BigInt(100),
                data: new Uint8Array(0),
                storageKey: 'db',
            },
        });

        const result = await updateAvatar(patient.userId, file.id);
        expect(result.avatarFileId).toBe(file.id);
    });
});

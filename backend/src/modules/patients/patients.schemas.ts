import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid patient ID format');

export const patientIdParamSchema = z.object({
    id: uuidSchema,
});

export const updatePatientProfileSchema = z.object({
    phone: z.string().max(20).optional().nullable(),
    // dateOfBirth is stored as a plain ISO date string ("YYYY-MM-DD") or, when
    // field encryption is active, as an AES-256-GCM ciphertext string.
    dateOfBirth: z.string().optional().nullable(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().nullable(),
    bloodGroup: z.string().max(10).optional().nullable(),
    height: z.number().int().min(50).max(250).optional().nullable(),
    weight: z.number().min(0).max(500).optional().nullable(),
    emergencyContactName: z.string().max(100).optional().nullable(),
    emergencyContactPhone: z.string().max(20).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
});

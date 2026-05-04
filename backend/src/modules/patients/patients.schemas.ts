import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid patient ID format');

export const patientIdParamSchema = z.object({
    id: uuidSchema,
});

export const updatePatientProfileSchema = z.object({
    phone: z.string().max(20).optional().nullable(),
    dateOfBirth: z
        .string()
        .optional()
        .nullable()
        .transform((s) => (s === undefined ? undefined : s === null ? null : new Date(s))),
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

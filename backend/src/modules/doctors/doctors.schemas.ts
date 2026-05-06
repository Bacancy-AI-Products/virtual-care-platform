import { z } from 'zod';
import { config } from '../../config';

const uuidSchema = z.string().uuid('Invalid doctor ID format');

export const listDoctorsQuerySchema = z.object({
    specialization: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    verified: z
        .string()
        .optional()
        .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(config.pagination.maxLimit)
        .default(config.pagination.defaultLimit),
});

export const doctorIdParamSchema = z.object({
    id: uuidSchema,
});

export const availabilityQuerySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
});

export const updateDoctorProfileSchema = z.object({
    specialization: z.string().min(1, 'Specialization is required').max(200).optional(),
    experienceYears: z.number().int().min(0).max(70).optional(),
    bio: z.string().max(2000).optional().nullable(),
    consultationFee: z.number().min(0).optional().nullable(),
    registrationNumber: z.string().max(100).optional().nullable(),
    degree: z.string().max(100).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    isActive: z.boolean().optional(),
});

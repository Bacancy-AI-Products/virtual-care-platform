import { z } from 'zod';
import { config } from '../../config';

const uuidSchema = z.string().uuid('Invalid ID format');

// Mirrors the Prisma enum. Kept here so HTTP-layer validation has no Prisma import.
export const vitalTypeSchema = z.enum([
    'BP_SYSTOLIC',
    'BP_DIASTOLIC',
    'HEART_RATE',
    'BLOOD_SUGAR',
    'SPO2',
    'TEMPERATURE',
    'WEIGHT',
]);

export const vitalEntryMethodSchema = z
    .enum(['MANUAL', 'BLUETOOTH_DEVICE', 'CONNECTED_APP', 'IMPORTED'])
    .default('MANUAL');

export const vitalIdParamSchema = z.object({
    id: uuidSchema,
});

export const patientIdParamSchema = z.object({
    patientId: uuidSchema,
});

export const createVitalReadingSchema = z.object({
    type: vitalTypeSchema,
    // Use coerce so the client can post either a string ("128") or a number (128).
    value: z.coerce.number().finite('Value must be a finite number'),
    recordedAt: z.string().datetime({ message: 'recordedAt must be an ISO datetime' }).optional(),
    entryMethod: vitalEntryMethodSchema.optional(),
    notes: z.string().max(2000).optional().nullable(),
});

export const listMyVitalsQuerySchema = z.object({
    type: vitalTypeSchema.optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(config.pagination.maxLimit)
        .default(config.pagination.defaultLimit),
    page: z.coerce.number().int().min(1).default(1),
});

export const trendsQuerySchema = z.object({
    // Window in days; default 30 to match the common monitoring view.
    days: z.coerce.number().int().min(1).max(365).default(30),
});

export const recentStatusQuerySchema = z.object({
    // How far back to look when summarising patient vitals status.
    days: z.coerce.number().int().min(1).max(90).default(7),
});

export type CreateVitalReadingInput = z.infer<typeof createVitalReadingSchema>;
export type ListMyVitalsQuery = z.infer<typeof listMyVitalsQuerySchema>;
export type TrendsQuery = z.infer<typeof trendsQuerySchema>;
export type RecentStatusQuery = z.infer<typeof recentStatusQuerySchema>;
export type VitalTypeLiteral = z.infer<typeof vitalTypeSchema>;

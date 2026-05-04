import { z } from 'zod';
import { config } from '../../config';

const uuidSchema = z.string().uuid('Invalid ID format');

export const appointmentIdParamSchema = z.object({
    appointmentId: uuidSchema,
});

export const prescriptionIdParamSchema = z.object({
    id: uuidSchema,
});

const prescriptionItemSchema = z.object({
    drugName: z.string().min(1, 'Drug name is required').max(200),
    dosage: z.string().max(100).optional().nullable(),
    frequency: z.string().max(100).optional().nullable(),
    duration: z.string().max(100).optional().nullable(),
    quantity: z.string().max(50).optional().nullable(),
    instructions: z.string().max(500).optional().nullable(),
});

export const createPrescriptionSchema = z.object({
    notes: z.string().max(2000).optional().nullable(),
    items: z.array(prescriptionItemSchema).min(1, 'At least one prescription item is required'),
});

export const listMyPrescriptionsQuerySchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(config.pagination.maxLimit)
        .default(config.pagination.defaultLimit),
});

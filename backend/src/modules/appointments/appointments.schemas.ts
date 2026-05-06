import { z } from 'zod';
import { config } from '../../config';

const uuidSchema = z.string().uuid('Invalid ID format');

/** URL param for appointment-scoped routes */
export const appointmentIdParamSchema = z.object({
    appointmentId: uuidSchema,
});

/** Allowed status values when doctor confirms or declines */
const doctorStatusSchema = z.enum(['CONFIRMED', 'CANCELLED_BY_DOCTOR']);

export const updateStatusSchema = z
    .object({
        status: doctorStatusSchema,
        declineReason: z.string().max(500).optional(),
    })
    .refine(
        (data) =>
            data.status !== 'CANCELLED_BY_DOCTOR' ||
            (data.declineReason && data.declineReason.trim().length > 0),
        { message: 'A reason is required when declining an appointment', path: ['declineReason'] },
    );

export type UpdateStatusBody = z.infer<typeof updateStatusSchema>;

/** Body for patient creating a booking (request) */
export const createAppointmentSchema = z.object({
    doctorId: uuidSchema,
    /** ISO 8601 datetime string */
    scheduledAt: z.string().datetime({ message: 'scheduledAt must be a valid ISO 8601 datetime' }),
    durationMinutes: z.number().int().min(15).max(120).default(30),
    reason: z.string().max(1000).optional().nullable(),
});

export type CreateAppointmentBody = z.infer<typeof createAppointmentSchema>;

export const listAppointmentsQuerySchema = z.object({
    status: z
        .enum([
            'PENDING',
            'CONFIRMED',
            'COMPLETED',
            'CANCELLED_BY_PATIENT',
            'CANCELLED_BY_DOCTOR',
            'NO_SHOW',
        ])
        .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(config.pagination.maxLimit)
        .default(config.pagination.defaultLimit),
});

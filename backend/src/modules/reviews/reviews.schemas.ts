import { z } from 'zod';
import { config } from '../../config';

export const doctorIdParamSchema = z.object({
    id: z.string().uuid('Invalid doctor ID format'),
});

export const appointmentIdParamSchema = z.object({
    appointmentId: z.string().uuid('Invalid appointment ID format'),
});

export const listReviewsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(config.pagination.maxLimit)
        .default(config.pagination.defaultLimit),
});

export const createReviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional().nullable(),
});

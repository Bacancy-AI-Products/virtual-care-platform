import { z } from 'zod';
import { config } from '../../config';

/** Query params for GET /notifications (paginated list). */
export const listNotificationsQuerySchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(config.pagination.maxLimit)
        .default(config.pagination.defaultLimit),
    before: z.string().datetime().optional(), // ISO date cursor for createdAt
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

/** URL param for PATCH /notifications/:id/read */
export const notificationIdParamSchema = z.object({
    id: z.string().uuid(),
});

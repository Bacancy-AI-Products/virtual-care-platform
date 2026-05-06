import { z } from 'zod';

export const createRoomParamsSchema = z.object({
    appointmentId: z.string().uuid(),
});

export const getTokenParamsSchema = z.object({
    appointmentId: z.string().uuid(),
});

export type CreateRoomParams = z.infer<typeof createRoomParamsSchema>;
export type GetTokenParams = z.infer<typeof getTokenParamsSchema>;

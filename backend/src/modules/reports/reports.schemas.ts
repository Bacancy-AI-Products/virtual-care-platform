import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid ID format');

export const patientVitalsSummaryQuerySchema = z.object({
    // Window in days for the vitals summary PDF. Default 30, max 365.
    days: z.coerce.number().int().min(1).max(365).default(30),
});

export const rpmMinutesQuerySchema = z.object({
    // ISO `YYYY-MM` — defaults to the current month if omitted.
    month: z
        .string()
        .regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM')
        .optional(),
    // Optionally filter to a single patient (e.g. when exporting a single row).
    patientId: uuidSchema.optional(),
});

export const productivityQuerySchema = z.object({
    // Days included in the productivity window. Default 30.
    days: z.coerce.number().int().min(7).max(365).default(30),
});

export type PatientVitalsSummaryQuery = z.infer<typeof patientVitalsSummaryQuerySchema>;
export type RpmMinutesQuery = z.infer<typeof rpmMinutesQuerySchema>;
export type ProductivityQuery = z.infer<typeof productivityQuerySchema>;

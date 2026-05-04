import type { ZodError } from 'zod';

export interface AppError extends Error {
    status?: number;
    code?: string;
    details?: unknown;
}

/**
 * Creates an error for Zod validation failures. Use with next() for consistent API responses.
 */
export function toValidationError(zodError: ZodError): AppError {
    const first = zodError.issues[0];
    const err = new Error(first?.message ?? 'Validation failed') as AppError;
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    err.details = zodError.flatten();
    return err;
}

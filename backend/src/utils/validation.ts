import type { ZodError } from 'zod';
import { AppError } from './errors';

/**
 * Creates an `AppError` for Zod validation failures. Pass the result to
 * `next()` so the central errorHandler turns it into a 400 response with
 * code `VALIDATION_ERROR`.
 *
 * Returning an `AppError` instance (not a plain Error tagged with `.status`)
 * is critical — errorHandler checks `err instanceof AppError`, so anything
 * else falls through to 500.
 */
export function toValidationError(zodError: ZodError): AppError {
    const first = zodError.issues[0];
    return new AppError(
        first?.message ?? 'Validation failed',
        400,
        'VALIDATION_ERROR',
        zodError.flatten(),
    );
}

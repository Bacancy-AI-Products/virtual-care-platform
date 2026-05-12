/**
 * Demo: pure unit test. No DB, no setup, no mocks. Fast.
 *
 * Tests the error class shape that the rest of the codebase relies on.
 */
import { describe, expect, it } from 'vitest';
import { AppError } from './errors';

describe('AppError', () => {
    it('defaults status to 500 and code to INTERNAL_ERROR when only message provided', () => {
        const err = new AppError('Something broke');
        expect(err.message).toBe('Something broke');
        expect(err.status).toBe(500);
        expect(err.code).toBe('INTERNAL_ERROR');
        expect(err.details).toBeUndefined();
    });

    it('carries status, code, and details through to the instance', () => {
        const details = { field: 'email' };
        const err = new AppError('Invalid email', 400, 'BAD_REQUEST', details);
        expect(err.status).toBe(400);
        expect(err.code).toBe('BAD_REQUEST');
        expect(err.details).toEqual(details);
    });

    it('is an instance of Error so existing try/catch chains still work', () => {
        const err = new AppError('boom', 500, 'INTERNAL_ERROR');
        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe('AppError');
    });
});

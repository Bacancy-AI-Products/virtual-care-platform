/**
 * Tests for `appointmentsApi`. Focus: URL construction + conditional query
 * param mapping. Backend behavior is tested in the backend supertest suite.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appointmentsApi } from './appointments';
import { useAuthStore } from '@/store/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api/v1';

const fetchSpy = vi.fn();
const okJson = <T>(body: T) =>
    new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

beforeEach(() => {
    fetchSpy.mockReset();
    global.fetch = fetchSpy as unknown as typeof fetch;
    useAuthStore.setState({ token: null, user: null });
});
afterEach(() => vi.restoreAllMocks());

describe('appointmentsApi.book', () => {
    it('POSTs to /appointments with full body', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({}));
        await appointmentsApi.book({
            doctorId: 'd1',
            scheduledAt: '2026-01-01T10:00:00.000Z',
            durationMinutes: 45,
            reason: 'Follow-up',
        });

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/appointments`);
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body)).toEqual({
            doctorId: 'd1',
            scheduledAt: '2026-01-01T10:00:00.000Z',
            durationMinutes: 45,
            reason: 'Follow-up',
        });
    });
});

describe('appointmentsApi.list', () => {
    it('omits all query params when called with no arguments', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ data: [] }));
        await appointmentsApi.list();

        const [url] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/appointments`);
    });

    it('includes only the params that are passed', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ data: [] }));
        await appointmentsApi.list({ status: 'PENDING', page: 2, limit: 10 });

        const [url] = fetchSpy.mock.calls[0];
        expect(url).toContain('status=PENDING');
        expect(url).toContain('page=2');
        expect(url).toContain('limit=10');
    });

    it('skips falsy page/limit values (0 should not be sent)', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ data: [] }));
        await appointmentsApi.list({ page: 0 });

        const [url] = fetchSpy.mock.calls[0];
        expect(url).not.toContain('page=');
    });
});

describe('appointmentsApi.getById', () => {
    it('GETs /appointments/:id', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({}));
        await appointmentsApi.getById('a-1');

        const [url] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/appointments/a-1`);
    });
});

describe('appointmentsApi.cancel', () => {
    it('PATCHes /appointments/:id/cancel', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({}));
        await appointmentsApi.cancel('a-1');

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/appointments/a-1/cancel`);
        expect(init.method).toBe('PATCH');
    });
});

describe('appointmentsApi.updateStatus', () => {
    it('PATCHes /appointments/:id/status with status only when confirming', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({}));
        await appointmentsApi.updateStatus('a-1', 'CONFIRMED');

        const [, init] = fetchSpy.mock.calls[0];
        expect(JSON.parse(init.body)).toEqual({ status: 'CONFIRMED' });
    });

    it('includes declineReason when declining', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({}));
        await appointmentsApi.updateStatus('a-1', 'CANCELLED_BY_DOCTOR', 'Scheduling conflict');

        const [, init] = fetchSpy.mock.calls[0];
        expect(JSON.parse(init.body)).toEqual({
            status: 'CANCELLED_BY_DOCTOR',
            declineReason: 'Scheduling conflict',
        });
    });
});

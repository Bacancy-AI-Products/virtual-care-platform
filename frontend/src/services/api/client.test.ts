/**
 * Demo: API client test. Stubs `global.fetch` directly — NOT MSW.
 *
 * Why not MSW here? The code under test IS the fetch wrapper. Intercepting at
 * the network layer with MSW would obscure exactly what we want to verify
 * (headers, URL building, status handling). MSW shines for component tests
 * where the network is incidental.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from './client';
import { useAuthStore } from '@/store/auth';

const ok = <T>(body: T, init: ResponseInit = { status: 200 }) =>
    new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });

const fetchSpy = vi.fn();

beforeEach(() => {
    fetchSpy.mockReset();
    global.fetch = fetchSpy as unknown as typeof fetch;
    useAuthStore.setState({ token: null, user: null });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('request()', () => {
    it('adds Authorization header when a token is in the auth store', async () => {
        useAuthStore.setState({ token: 'jwt-xyz', user: null });
        fetchSpy.mockResolvedValueOnce(ok({ ok: true }));

        await request('/auth/me');

        const [, init] = fetchSpy.mock.calls[0];
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-xyz');
    });

    it('omits Authorization header when no token is set', async () => {
        fetchSpy.mockResolvedValueOnce(ok({ ok: true }));

        await request('/auth/me');

        const [, init] = fetchSpy.mock.calls[0];
        expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    });

    it('throws ApiError carrying status and code from backend error envelope', async () => {
        fetchSpy.mockResolvedValueOnce(
            new Response(JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'nope' } }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        const err = await request('/foo').catch((e: unknown) => e);

        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(400);
        expect((err as ApiError).code).toBe('BAD_REQUEST');
        expect((err as ApiError).message).toBe('nope');
    });

    it('calls logout() on 401 responses', async () => {
        const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');
        useAuthStore.setState({ token: 'stale-jwt', user: null });
        fetchSpy.mockResolvedValueOnce(
            new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'gone' } }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        await request('/protected').catch(() => {});

        expect(logoutSpy).toHaveBeenCalledOnce();
    });

    it('returns undefined for 204 No Content', async () => {
        fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
        const result = await request<undefined>('/foo', { method: 'DELETE' });
        expect(result).toBeUndefined();
    });
});

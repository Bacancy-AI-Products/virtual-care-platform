/**
 * Tests for `authApi`. Stubs `global.fetch` to assert the URL, method, and
 * body shape sent to the backend — the contract the frontend agrees with the
 * service team about.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from './auth';
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

afterEach(() => {
    vi.restoreAllMocks();
});

describe('authApi.login', () => {
    it('POSTs to /auth/login with email + password JSON body', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ token: 'j', user: { id: '1' } }));

        await authApi.login('a@b.com', 'pw');

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/auth/login`);
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'pw' });
    });
});

describe('authApi.signup', () => {
    it('routes PATIENT signups to /auth/signup/patient', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ token: 'j', user: { id: '1' } }));

        await authApi.signup({ name: 'A', email: 'a@b.com', password: 'pw', role: 'PATIENT' });

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/auth/signup/patient`);
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body)).toEqual({ name: 'A', email: 'a@b.com', password: 'pw' });
        // role is the URL discriminator — should NOT be in the body
        expect(JSON.parse(init.body).role).toBeUndefined();
    });

    it('routes DOCTOR signups to /auth/signup/doctor', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ token: 'j', user: { id: '1' } }));

        await authApi.signup({ name: 'D', email: 'd@b.com', password: 'pw', role: 'DOCTOR' });

        const [url] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/auth/signup/doctor`);
    });
});

describe('authApi.logout', () => {
    it('POSTs to /auth/logout (no body)', async () => {
        fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));

        await authApi.logout();

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/auth/logout`);
        expect(init.method).toBe('POST');
    });
});

describe('authApi.forgotPassword', () => {
    it('POSTs to /auth/forgot-password with the email in the body', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ message: 'ok' }));

        await authApi.forgotPassword('a@b.com');

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/auth/forgot-password`);
        expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com' });
    });
});

describe('authApi.resetPassword', () => {
    it('POSTs to /auth/reset-password with token + newPassword', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ message: 'ok' }));

        await authApi.resetPassword('reset-tkn', 'NewPass@123');

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/auth/reset-password`);
        expect(JSON.parse(init.body)).toEqual({ token: 'reset-tkn', newPassword: 'NewPass@123' });
    });
});

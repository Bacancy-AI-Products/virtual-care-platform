/**
 * Tests for `doctorsApi`. Focus: filter param construction + availability
 * window params. Backend filter behavior tested in backend suite.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { doctorsApi } from './doctors';
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

describe('doctorsApi.list', () => {
    it('GETs /doctors with no query params when called with no args', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ data: [] }));
        await doctorsApi.list();

        const [url] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/doctors`);
    });

    it('maps each filter onto the query string', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ data: [] }));
        await doctorsApi.list({
            specialization: 'Cardiology',
            city: 'Boston',
            state: 'MA',
            q: 'banner',
            page: 2,
            limit: 25,
        });

        const [url] = fetchSpy.mock.calls[0];
        expect(url).toContain('specialization=Cardiology');
        expect(url).toContain('city=Boston');
        expect(url).toContain('state=MA');
        expect(url).toContain('q=banner');
        expect(url).toContain('page=2');
        expect(url).toContain('limit=25');
    });

    it('omits empty-string filters', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ data: [] }));
        await doctorsApi.list({ specialization: '', city: 'Boston' });

        const [url] = fetchSpy.mock.calls[0];
        expect(url).not.toContain('specialization');
        expect(url).toContain('city=Boston');
    });
});

describe('doctorsApi.getById', () => {
    it('GETs /doctors/:id', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({}));
        await doctorsApi.getById('doc-1');
        expect(fetchSpy.mock.calls[0][0]).toBe(`${API}/doctors/doc-1`);
    });
});

describe('doctorsApi.getAvailability', () => {
    it('includes from/to in query string when provided', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ availability: [], bookedAppointments: [] }));
        await doctorsApi.getAvailability('doc-1', {
            from: '2026-01-01T00:00:00.000Z',
            to: '2026-01-02T00:00:00.000Z',
        });

        const [url] = fetchSpy.mock.calls[0];
        expect(url).toContain(`${API}/doctors/doc-1/availability`);
        expect(url).toContain('from=');
        expect(url).toContain('to=');
    });

    it('omits from/to when not provided', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ availability: [], bookedAppointments: [] }));
        await doctorsApi.getAvailability('doc-1');

        const [url] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/doctors/doc-1/availability`);
    });
});

describe('doctorsApi.updateMe', () => {
    it('PUTs to /doctors/me with the partial profile body', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({}));
        await doctorsApi.updateMe({ specialization: 'Cardiology', bio: 'Hi' });

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/doctors/me`);
        expect(init.method).toBe('PUT');
        expect(JSON.parse(init.body)).toEqual({ specialization: 'Cardiology', bio: 'Hi' });
    });
});

describe('doctorsApi.updateMyAvailability', () => {
    it('PUTs to /doctors/me/availability with the slots wrapped in `availability`', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ availability: [] }));
        await doctorsApi.updateMyAvailability([
            { weekday: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
        ]);

        const [, init] = fetchSpy.mock.calls[0];
        const body = JSON.parse(init.body);
        expect(body).toHaveProperty('availability');
        expect(body.availability).toHaveLength(1);
    });
});

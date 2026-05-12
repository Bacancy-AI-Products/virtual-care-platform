/**
 * Tests for `prescriptionsApi`. Focus: URL with appointmentId path param
 * and the `getMine` limit query.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prescriptionsApi } from './prescriptions';
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

describe('prescriptionsApi.create', () => {
    it('POSTs to /prescriptions/appointment/:appointmentId', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({}));

        await prescriptionsApi.create('appt-1', {
            notes: 'Take after meals',
            items: [{ drugName: 'Amoxicillin', dosage: '500mg' }],
        });

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/prescriptions/appointment/appt-1`);
        expect(init.method).toBe('POST');
        const body = JSON.parse(init.body);
        expect(body.notes).toBe('Take after meals');
        expect(body.items).toHaveLength(1);
    });
});

describe('prescriptionsApi.getByAppointment', () => {
    it('GETs /prescriptions/appointment/:appointmentId', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ prescriptions: [] }));
        await prescriptionsApi.getByAppointment('appt-1');

        expect(fetchSpy.mock.calls[0][0]).toBe(`${API}/prescriptions/appointment/appt-1`);
    });
});

describe('prescriptionsApi.getMine', () => {
    it('GETs /prescriptions/mine without query params by default', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ prescriptions: [] }));
        await prescriptionsApi.getMine();

        expect(fetchSpy.mock.calls[0][0]).toBe(`${API}/prescriptions/mine`);
    });

    it('appends limit to the query string when provided', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ prescriptions: [] }));
        await prescriptionsApi.getMine({ limit: 25 });

        expect(fetchSpy.mock.calls[0][0]).toContain('limit=25');
    });
});

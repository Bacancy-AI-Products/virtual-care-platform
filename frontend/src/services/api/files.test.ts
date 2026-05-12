/**
 * Tests for `filesApi`. Two interesting surfaces:
 *   1. `upload` — FormData construction (not JSON)
 *   2. `fetchBlob` — calls fetch directly (bypasses `request`) to handle blobs
 *
 * Backend file-permission tests live in the backend service suite.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { filesApi } from './files';
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

describe('filesApi.upload', () => {
    it('POSTs FormData (no JSON Content-Type) to /files/upload with the file field', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ id: 'f1' }));
        const file = new File(['hello'], 'a.png', { type: 'image/png' });

        await filesApi.upload(file);

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/files/upload`);
        expect(init.method).toBe('POST');
        expect(init.body).toBeInstanceOf(FormData);

        // Critical: do NOT set Content-Type — the browser must add the multipart boundary
        expect(init.headers?.['Content-Type']).toBeUndefined();

        const form = init.body as FormData;
        expect(form.get('file')).toBe(file);
    });

    it('appends appointmentId when provided', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ id: 'f1' }));
        const file = new File(['hello'], 'a.png', { type: 'image/png' });

        await filesApi.upload(file, 'appt-123');

        const form = fetchSpy.mock.calls[0][1].body as FormData;
        expect(form.get('appointmentId')).toBe('appt-123');
    });
});

describe('filesApi.getByAppointment', () => {
    it('GETs /files/appointment/:id', async () => {
        fetchSpy.mockResolvedValueOnce(okJson([]));
        await filesApi.getByAppointment('appt-1');

        expect(fetchSpy.mock.calls[0][0]).toBe(`${API}/files/appointment/appt-1`);
    });
});

describe('filesApi.fetchBlob', () => {
    it('GETs /files/download/:id and returns an object URL', async () => {
        const blob = new Blob(['x']);
        fetchSpy.mockResolvedValueOnce(new Response(blob, { status: 200 }));
        // jsdom doesn't implement URL.createObjectURL — assign a fake before calling.
        URL.createObjectURL = vi.fn(() => 'blob:fake-url');

        const url = await filesApi.fetchBlob('f1');

        expect(fetchSpy.mock.calls[0][0]).toBe(`${API}/files/download/f1`);
        expect(url).toBe('blob:fake-url');
    });

    it('sends Authorization header when a token is in the store', async () => {
        useAuthStore.setState({ token: 'jwt-xyz', user: null });
        fetchSpy.mockResolvedValueOnce(new Response(new Blob(['x']), { status: 200 }));
        URL.createObjectURL = vi.fn(() => 'blob:fake');

        await filesApi.fetchBlob('f1');

        const [, init] = fetchSpy.mock.calls[0];
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-xyz');
    });

    it('throws when the response is not ok', async () => {
        fetchSpy.mockResolvedValueOnce(new Response(null, { status: 403 }));

        await expect(filesApi.fetchBlob('f1')).rejects.toThrow('Failed to fetch file');
    });
});

describe('filesApi.getDownloadUrl', () => {
    it('returns a fully-qualified URL string (no fetch involved)', () => {
        expect(filesApi.getDownloadUrl('f1')).toBe(`${API}/files/download/f1`);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

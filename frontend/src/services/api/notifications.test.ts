/**
 * Tests for `notificationsApi`. Focus on the `before` cursor query param
 * and the PATCH endpoints.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationsApi } from './notifications';
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

describe('notificationsApi.list', () => {
    it('GETs /notifications with no params by default', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ notifications: [] }));
        await notificationsApi.list();

        expect(fetchSpy.mock.calls[0][0]).toBe(`${API}/notifications`);
    });

    it('passes limit + before through as query params', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ notifications: [] }));
        await notificationsApi.list({ limit: 20, before: '2026-01-01T00:00:00.000Z' });

        const [url] = fetchSpy.mock.calls[0];
        expect(url).toContain('limit=20');
        expect(url).toContain('before=');
    });
});

describe('notificationsApi.getUnreadCount', () => {
    it('GETs /notifications/unread-count', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ count: 0 }));
        await notificationsApi.getUnreadCount();

        expect(fetchSpy.mock.calls[0][0]).toBe(`${API}/notifications/unread-count`);
    });
});

describe('notificationsApi.markRead', () => {
    it('PATCHes /notifications/:id/read', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ success: true }));
        await notificationsApi.markRead('n1');

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/notifications/n1/read`);
        expect(init.method).toBe('PATCH');
    });
});

describe('notificationsApi.markAllRead', () => {
    it('PATCHes /notifications/read-all', async () => {
        fetchSpy.mockResolvedValueOnce(okJson({ success: true }));
        await notificationsApi.markAllRead();

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${API}/notifications/read-all`);
        expect(init.method).toBe('PATCH');
    });
});

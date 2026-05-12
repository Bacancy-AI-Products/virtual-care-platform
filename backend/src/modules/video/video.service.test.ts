/**
 * Service-layer tests for video.
 *
 * Daily.co is the external wire — the module's only real responsibility is
 * shaping correct requests and surfacing the response. We mock axios so the
 * test doesn't depend on Daily.co's API being reachable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock axios BEFORE importing the service so the cached AxiosInstance is the mocked one.
// `vi.mock` is hoisted above imports, so the spy must be defined via `vi.hoisted()`
// to be reachable from the mock factory.
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('axios', () => ({
    default: {
        create: () => ({ post }),
    },
}));

import { createDailyRoom, createMeetingToken } from './video.service';

beforeEach(() => {
    post.mockReset();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createDailyRoom', () => {
    it('posts to /rooms with consult-{appointmentId} name and 24h expiry', async () => {
        post.mockResolvedValueOnce({
            data: {
                id: 'room-1',
                name: 'consult-abc-123',
                url: 'https://telecareapp.daily.co/consult-abc-123',
                created_at: '2024-01-01T00:00:00.000Z',
                config: {},
            },
        });

        const result = await createDailyRoom('abc-123');

        expect(post).toHaveBeenCalledWith(
            '/rooms',
            expect.objectContaining({
                name: 'consult-abc-123',
                properties: expect.objectContaining({
                    enable_chat: true,
                    enable_screenshare: true,
                    exp: expect.any(Number),
                }),
            }),
        );

        // exp should be ~24h from now (within 60s tolerance)
        const callArgs = post.mock.calls[0][1] as { properties: { exp: number } };
        const expectedExp = Math.floor(Date.now() / 1000) + 86400;
        expect(callArgs.properties.exp).toBeGreaterThan(expectedExp - 60);
        expect(callArgs.properties.exp).toBeLessThan(expectedExp + 60);

        expect(result.url).toContain('consult-abc-123');
    });

    it('propagates errors from the Daily.co API', async () => {
        post.mockRejectedValueOnce(new Error('Daily.co 502'));

        await expect(createDailyRoom('abc-123')).rejects.toThrow('Daily.co 502');
    });
});

describe('createMeetingToken', () => {
    it('posts to /meeting-tokens with the right shape and 2h expiry', async () => {
        post.mockResolvedValueOnce({ data: { token: 'jwt-from-daily' } });

        const result = await createMeetingToken('consult-abc', 'user-1', 'Jane Doe', true);

        expect(result).toBe('jwt-from-daily');
        expect(post).toHaveBeenCalledWith(
            '/meeting-tokens',
            expect.objectContaining({
                properties: expect.objectContaining({
                    room_name: 'consult-abc',
                    user_id: 'user-1',
                    user_name: 'Jane Doe',
                    is_owner: true,
                }),
            }),
        );

        const callArgs = post.mock.calls[0][1] as { properties: { exp: number } };
        const expectedExp = Math.floor(Date.now() / 1000) + 7200;
        expect(callArgs.properties.exp).toBeGreaterThan(expectedExp - 60);
        expect(callArgs.properties.exp).toBeLessThan(expectedExp + 60);
    });

    it('defaults is_owner to false', async () => {
        post.mockResolvedValueOnce({ data: { token: 'jwt-x' } });
        await createMeetingToken('consult-abc', 'u', 'n');

        const callArgs = post.mock.calls[0][1] as { properties: { is_owner: boolean } };
        expect(callArgs.properties.is_owner).toBe(false);
    });
});

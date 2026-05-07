import { request } from './client';

export interface AppNotification {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string | null;
    read: boolean;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

export const notificationsApi = {
    list: (params?: { limit?: number; before?: string }) =>
        request<{ notifications: AppNotification[] }>('/notifications', {
            params: {
                ...(params?.limit ? { limit: String(params.limit) } : {}),
                ...(params?.before ? { before: params.before } : {}),
            },
        }),

    getUnreadCount: () => request<{ count: number }>('/notifications/unread-count'),

    markRead: (id: string) =>
        request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),

    markAllRead: () =>
        request<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' }),
};

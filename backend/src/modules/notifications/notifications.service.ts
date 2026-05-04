import { prisma } from '../../db';

/** Matches Prisma NotificationType enum; use local type so module compiles before prisma generate. */
export type NotificationType =
    | 'PRESCRIPTION_CREATED'
    | 'APPOINTMENT_CONFIRMED'
    | 'APPOINTMENT_DECLINED'
    | 'APPOINTMENT_REQUESTED'
    | 'APPOINTMENT_CANCELLED';

function serviceError(message: string, status: number, code: string): never {
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = status;
    err.code = code;
    throw err;
}

export interface CreateNotificationData {
    title: string;
    body?: string | null;
    metadata?: Record<string, unknown> | null;
}

const notificationSelect = {
    id: true,
    userId: true,
    type: true,
    title: true,
    body: true,
    read: true,
    metadata: true,
    createdAt: true,
} as const;

/**
 * Create a notification for a user. Persists only; does not emit over Socket.io.
 * Caller is responsible for calling emitToUser(userId, notification) after create.
 */
export async function create(userId: string, type: NotificationType, data: CreateNotificationData) {
    const notification = await (prisma as any).notification.create({
        data: {
            userId,
            type,
            title: data.title,
            body: data.body ?? null,
            metadata: data.metadata ?? null,
        },
        select: notificationSelect,
    });
    return notification;
}

export interface ListForUserOptions {
    limit: number;
    before?: string; // ISO date string; return notifications older than this
}

/**
 * List notifications for a user, newest first. Cursor-based pagination via before (createdAt).
 */
export async function listForUser(userId: string, options: ListForUserOptions) {
    const { limit, before } = options;
    const notifications = await (prisma as any).notification.findMany({
        where: {
            userId,
            ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        },
        select: notificationSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    return { notifications };
}

/** Get count of unread notifications for a user (for bell badge). */
export async function getUnreadCount(userId: string): Promise<number> {
    return (prisma as any).notification.count({
        where: { userId, read: false },
    });
}

/** Mark a single notification as read. Verifies ownership. */
export async function markRead(userId: string, notificationId: string) {
    const notification = await (prisma as any).notification.findUnique({
        where: { id: notificationId },
        select: { userId: true },
    });
    if (!notification) {
        serviceError('Notification not found', 404, 'NOT_FOUND');
    }
    if (notification.userId !== userId) {
        serviceError('Not authorized to update this notification', 403, 'FORBIDDEN');
    }
    await (prisma as any).notification.update({
        where: { id: notificationId },
        data: { read: true },
    });
    return { success: true };
}

/** Mark all notifications for a user as read. */
export async function markAllRead(userId: string) {
    await (prisma as any).notification.updateMany({
        where: { userId },
        data: { read: true },
    });
    return { success: true };
}

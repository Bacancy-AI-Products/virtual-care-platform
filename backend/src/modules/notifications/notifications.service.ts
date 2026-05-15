import { prisma } from '../../db';
import { AppError } from '../../utils/errors';
import { maybeEncrypt, maybeDecrypt } from '../../utils/crypto';

/** Matches Prisma NotificationType enum; use local type so module compiles before prisma generate. */
export type NotificationType =
    | 'PRESCRIPTION_CREATED'
    | 'APPOINTMENT_CONFIRMED'
    | 'APPOINTMENT_DECLINED'
    | 'APPOINTMENT_REQUESTED'
    | 'APPOINTMENT_CANCELLED';

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
    // Encrypt PHI fields before persisting
    const encryptedBody = maybeEncrypt(data.body ?? null) ?? null;
    // metadata is `Json?` — wrap the encrypted envelope in `{ enc: "..." }` so the
    // value is stored as a JSON object (unambiguous round-trip through jsonb)
    // rather than as a JSON string scalar.
    const metadataEnvelope = wrapMetadata(data.metadata ?? null);

    const notification = await (prisma as any).notification.create({
        data: {
            userId,
            type,
            title: data.title,
            body: encryptedBody,
            metadata: metadataEnvelope,
        },
        select: notificationSelect,
    });
    return decryptNotification(notification);
}

/** Encode metadata for persistence: `null` → null, otherwise `{ enc: <ciphertext> }`. */
function wrapMetadata(meta: Record<string, unknown> | null): { enc: string } | null {
    if (meta == null) return null;
    const serialized = JSON.stringify(meta);
    const enc = maybeEncrypt(serialized) ?? serialized;
    return { enc };
}

/** Decrypt PHI fields on a notification record. */
function decryptNotification<T extends { body?: string | null; metadata?: unknown }>(n: T): T {
    const decryptedBody = maybeDecrypt(n.body as string | null | undefined);
    let decryptedMetadata: unknown = n.metadata;
    if (
        n.metadata != null &&
        typeof n.metadata === 'object' &&
        'enc' in (n.metadata as Record<string, unknown>) &&
        typeof (n.metadata as { enc: unknown }).enc === 'string'
    ) {
        const raw = maybeDecrypt((n.metadata as { enc: string }).enc);
        try {
            decryptedMetadata = raw != null ? JSON.parse(raw) : null;
        } catch {
            decryptedMetadata = raw; // fallback: return as-is if not valid JSON
        }
    }
    return { ...n, body: decryptedBody, metadata: decryptedMetadata };
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
    return { notifications: notifications.map(decryptNotification) };
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
        throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }
    if (notification.userId !== userId) {
        throw new AppError('Not authorized to update this notification', 403, 'FORBIDDEN');
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

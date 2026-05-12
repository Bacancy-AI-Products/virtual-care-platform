/**
 * Service-layer tests for notifications.
 *
 * Highest-risk surface: ownership enforcement on markRead (can't mark
 * someone else's notification as read).
 */
import '../../../test/setupDb';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../db';
import { createNotification, createPatient } from '../../../test/factories';
import {
    create,
    getUnreadCount,
    listForUser,
    markAllRead,
    markRead,
} from './notifications.service';

// ─── create ───────────────────────────────────────────────────────────────────

describe('notifications.create', () => {
    it('persists a notification with the given type, title, and metadata', async () => {
        const patient = await createPatient();

        const result = await create(patient.userId, 'APPOINTMENT_CONFIRMED', {
            title: 'Booked',
            body: 'Your appointment is confirmed',
            metadata: { appointmentId: 'abc' },
        });

        expect(result.userId).toBe(patient.userId);
        expect(result.title).toBe('Booked');
        expect(result.read).toBe(false);
        expect(result.metadata).toEqual({ appointmentId: 'abc' });
    });
});

// ─── listForUser ──────────────────────────────────────────────────────────────

describe('notifications.listForUser', () => {
    it('returns notifications scoped to the user, newest first', async () => {
        const patientA = await createPatient();
        const patientB = await createPatient();
        await createNotification(patientA.userId, { title: 'A1' });
        await createNotification(patientA.userId, { title: 'A2' });
        await createNotification(patientB.userId, { title: 'B1' });

        const result = await listForUser(patientA.userId, { limit: 50 });

        expect(result.notifications).toHaveLength(2);
        expect(result.notifications.map((n: { userId: string }) => n.userId)).toEqual([
            patientA.userId,
            patientA.userId,
        ]);
    });

    it('respects the limit parameter', async () => {
        const patient = await createPatient();
        for (let i = 0; i < 5; i++) {
            await createNotification(patient.userId, { title: `n${i}` });
        }

        const result = await listForUser(patient.userId, { limit: 3 });
        expect(result.notifications).toHaveLength(3);
    });

    it('filters by `before` cursor (returns notifications older than the cutoff)', async () => {
        const patient = await createPatient();
        const oldOne = await createNotification(patient.userId, { title: 'old' });
        // Force a later createdAt on the new one
        await new Promise((r) => setTimeout(r, 10));
        const newOne = await createNotification(patient.userId, { title: 'new' });

        const result = await listForUser(patient.userId, {
            limit: 10,
            before: newOne.createdAt.toISOString(),
        });

        expect(result.notifications.map((n: { id: string }) => n.id)).toEqual([oldOne.id]);
    });
});

// ─── getUnreadCount ───────────────────────────────────────────────────────────

describe('notifications.getUnreadCount', () => {
    it('counts only unread notifications for the user', async () => {
        const patient = await createPatient();
        await createNotification(patient.userId, { read: false });
        await createNotification(patient.userId, { read: false });
        await createNotification(patient.userId, { read: true });

        const count = await getUnreadCount(patient.userId);
        expect(count).toBe(2);
    });

    it('ignores notifications belonging to other users', async () => {
        const a = await createPatient();
        const b = await createPatient();
        await createNotification(a.userId, { read: false });
        await createNotification(b.userId, { read: false });

        expect(await getUnreadCount(a.userId)).toBe(1);
        expect(await getUnreadCount(b.userId)).toBe(1);
    });
});

// ─── markRead (ownership!) ────────────────────────────────────────────────────

describe('notifications.markRead', () => {
    it("marks the user's own notification as read", async () => {
        const patient = await createPatient();
        const n = await createNotification(patient.userId);

        await markRead(patient.userId, n.id);

        const after = await prisma.notification.findUnique({ where: { id: n.id } });
        expect(after?.read).toBe(true);
    });

    it("rejects marking another user's notification as read (403)", async () => {
        const a = await createPatient();
        const b = await createPatient();
        const n = await createNotification(a.userId);

        await expect(markRead(b.userId, n.id)).rejects.toMatchObject({
            status: 403,
            code: 'FORBIDDEN',
        });

        const after = await prisma.notification.findUnique({ where: { id: n.id } });
        expect(after?.read).toBe(false);
    });

    it('throws 404 for an unknown notification id', async () => {
        const patient = await createPatient();
        await expect(
            markRead(patient.userId, '00000000-0000-0000-0000-000000000000'),
        ).rejects.toMatchObject({ status: 404 });
    });
});

// ─── markAllRead ──────────────────────────────────────────────────────────────

describe('notifications.markAllRead', () => {
    it("marks all of the user's notifications as read", async () => {
        const patient = await createPatient();
        await createNotification(patient.userId, { read: false });
        await createNotification(patient.userId, { read: false });

        await markAllRead(patient.userId);

        expect(await getUnreadCount(patient.userId)).toBe(0);
    });

    it("does not touch other users' notifications", async () => {
        const a = await createPatient();
        const b = await createPatient();
        await createNotification(a.userId, { read: false });
        await createNotification(b.userId, { read: false });

        await markAllRead(a.userId);

        expect(await getUnreadCount(b.userId)).toBe(1);
    });
});

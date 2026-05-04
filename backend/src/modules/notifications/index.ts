import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../../middleware';
import { toValidationError } from '../../utils/validation';
import * as notificationsService from './notifications.service';
import { listNotificationsQuerySchema, notificationIdParamSchema } from './notifications.schemas';

const router = Router();

/**
 * GET /notifications
 * List notifications for the current user (newest first). Paginated via limit and before (ISO date cursor).
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const queryParsed = listNotificationsQuerySchema.safeParse(req.query);
        if (!queryParsed.success) {
            next(toValidationError(queryParsed.error));
            return;
        }
        const { user } = req as AuthenticatedRequest;
        if (!user) {
            next(new Error('Authentication required'));
            return;
        }
        const result = await notificationsService.listForUser(user.sub, {
            limit: queryParsed.data.limit,
            before: queryParsed.data.before,
        });
        res.json(result);
    } catch (e) {
        next(e);
    }
});

/**
 * GET /notifications/unread-count
 * Return count of unread notifications (for bell badge).
 */
router.get(
    '/unread-count',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { user } = req as AuthenticatedRequest;
            if (!user) {
                next(new Error('Authentication required'));
                return;
            }
            const count = await notificationsService.getUnreadCount(user.sub);
            res.json({ count });
        } catch (e) {
            next(e);
        }
    },
);

/**
 * PATCH /notifications/read-all
 * Mark all notifications for the current user as read. Must be before /:id/read so "read-all" is not captured as id.
 */
router.patch('/read-all', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user } = req as AuthenticatedRequest;
        if (!user) {
            next(new Error('Authentication required'));
            return;
        }
        const result = await notificationsService.markAllRead(user.sub);
        res.json(result);
    } catch (e) {
        next(e);
    }
});

/**
 * PATCH /notifications/:id/read
 * Mark one notification as read. User must own the notification.
 */
router.patch('/:id/read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const paramParsed = notificationIdParamSchema.safeParse(req.params);
        if (!paramParsed.success) {
            next(toValidationError(paramParsed.error));
            return;
        }
        const { user } = req as AuthenticatedRequest;
        if (!user) {
            next(new Error('Authentication required'));
            return;
        }
        const result = await notificationsService.markRead(user.sub, paramParsed.data.id);
        res.json(result);
    } catch (e) {
        next(e);
    }
});

export { router as notificationsRouter };

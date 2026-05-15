import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { logAccess, AuditActionType } from '../modules/audit/audit.service';

/**
 * Express middleware that writes an AccessLog entry after the response is sent.
 *
 * Usage:
 *   router.get('/:id', requireAuth, auditPhiAccess('APPOINTMENT_READ', 'Appointment'), handler)
 *
 * The middleware fires on `res.finish` so it adds zero latency to the response.
 * The resourceId is extracted from common param names (fileId, appointmentId, id).
 */
export function auditPhiAccess(action: AuditActionType | string, resourceType?: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        res.on('finish', () => {
            const resourceId =
                (req.params as Record<string, string | undefined>)?.fileId ??
                (req.params as Record<string, string | undefined>)?.appointmentId ??
                (req.params as Record<string, string | undefined>)?.id ??
                undefined;

            void logAccess({
                userId: req.user?.sub,
                actorRole: req.user?.role,
                action,
                resourceType,
                resourceId,
                ip: req.ip ?? req.socket?.remoteAddress,
                userAgent: req.get('User-Agent'),
                requestId: (req as AuthenticatedRequest & { id?: string }).id,
                httpMethod: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
                success: res.statusCode < 400,
            });
        });
        next();
    };
}

import { Request, Response, NextFunction } from 'express';
import { assertTokenNotRevoked } from '../modules/auth/auth.service';
import { JwtPayload, verifyToken } from '../utils';
import { AppError } from '../utils/errors';

/** Request with authenticated user attached (set by requireAuth). */
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

/**
 * Extracts and verifies JWT from Authorization: Bearer <token>.
 * Attaches decoded payload to req.user. Passes to errorHandler on missing/invalid token.
 */
export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
        next(new AppError('Missing or invalid authorization token', 401, 'UNAUTHORIZED'));
        return;
    }

    void (async () => {
        try {
            const payload = verifyToken(token);
            await assertTokenNotRevoked(payload.sub, payload.tv);
            req.user = payload;
            next();
        } catch (error) {
            if (error instanceof AppError) {
                next(error);
                return;
            }
            next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
        }
    })();
}

/**
 * Returns middleware that enforces req.user.role is one of the allowed roles.
 * Must be used after requireAuth.
 */
export function requireRole(...roles: string[]) {
    return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
            return;
        }
        next();
    };
}

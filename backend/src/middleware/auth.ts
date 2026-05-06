import { Request, Response, NextFunction } from 'express';
import { JwtPayload, verifyToken } from '../utils';

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
        const err = new Error('Missing or invalid authorization token') as Error & {
            status?: number;
            code?: string;
        };
        err.status = 401;
        err.code = 'UNAUTHORIZED';
        next(err);
        return;
    }

    try {
        req.user = verifyToken(token);
        next();
    } catch {
        const err = new Error('Invalid or expired token') as Error & {
            status?: number;
            code?: string;
        };
        err.status = 401;
        err.code = 'UNAUTHORIZED';
        next(err);
    }
}

/**
 * Returns middleware that enforces req.user.role is one of the allowed roles.
 * Must be used after requireAuth.
 */
export function requireRole(...roles: string[]) {
    return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            const err = new Error('Authentication required') as Error & {
                status?: number;
                code?: string;
            };
            err.status = 401;
            err.code = 'UNAUTHORIZED';
            next(err);
            return;
        }
        if (!roles.includes(req.user.role)) {
            const err = new Error('Insufficient permissions') as Error & {
                status?: number;
                code?: string;
            };
            err.status = 403;
            err.code = 'FORBIDDEN';
            next(err);
            return;
        }
        next();
    };
}

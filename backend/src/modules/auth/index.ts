import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '../../../generated/prisma';
import { requireAuth, type AuthenticatedRequest } from '../../middleware';
import { toValidationError } from '../../utils/validation';
import { logAccess, AuditAction } from '../audit/audit.service';
import * as authService from './auth.service';
import {
    forgotPasswordSchema,
    loginSchema,
    resetPasswordSchema,
    signupSchema,
} from './auth.schemas';

const router = Router();

/**
 * POST /auth/logout
 * Revoke all active sessions for the current user.
 */
router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthenticatedRequest & { id?: string };
        const userId = authReq.user!.sub;
        await authService.revokeSessions(userId);
        void logAccess({
            userId,
            actorRole: authReq.user!.role,
            action: AuditAction.LOGOUT,
            ip: req.ip ?? req.socket?.remoteAddress,
            userAgent: req.get('User-Agent'),
            requestId: authReq.id,
            httpMethod: req.method,
            path: req.originalUrl,
            statusCode: 204,
            success: true,
        });
        res.status(204).send();
    } catch (e) {
        next(e);
    }
});

/**
 * POST /auth/login
 * Email/password login. Returns JWT + basic profile.
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            next(toValidationError(parsed.error));
            return;
        }

        const { email, password } = parsed.data;
        const auditCtx = {
            ip: req.ip ?? req.socket?.remoteAddress,
            userAgent: req.get('User-Agent'),
            requestId: (req as Request & { id?: string }).id,
            httpMethod: req.method,
            path: req.originalUrl,
        };

        try {
            const result = await authService.login(email, password);
            void logAccess({
                userId: result.user.id,
                actorRole: result.user.role,
                action: AuditAction.LOGIN_SUCCESS,
                ...auditCtx,
                statusCode: 200,
                success: true,
            });
            res.json(result);
        } catch (loginErr) {
            void logAccess({
                action: AuditAction.LOGIN_FAILURE,
                ...auditCtx,
                statusCode: 401,
                success: false,
            });
            next(loginErr);
        }
    } catch (e) {
        next(e);
    }
});

/**
 * Shared signup handler. Route determines role.
 * Doctors get a minimal DoctorProfile (placeholder specialization); complete via PUT /doctors/me.
 */
function createSignupHandler(role: Role) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = signupSchema.safeParse(req.body);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }

            const { name, email, password } = parsed.data;
            const result = await authService.signup(name, email, password, role);
            void logAccess({
                userId: result.user.id,
                actorRole: result.user.role,
                action: AuditAction.SIGNUP,
                ip: req.ip ?? req.socket?.remoteAddress,
                userAgent: req.get('User-Agent'),
                requestId: (req as Request & { id?: string }).id,
                httpMethod: req.method,
                path: req.originalUrl,
                statusCode: 201,
                success: true,
            });
            res.status(201).json(result);
        } catch (e) {
            next(e);
        }
    };
}

/** POST /auth/signup/patient – patient signup. Same request body as doctor. */
router.post('/signup/patient', createSignupHandler(Role.PATIENT));

/** POST /auth/signup/doctor – doctor signup. Complete profile later via PUT /doctors/me. */
router.post('/signup/doctor', createSignupHandler(Role.DOCTOR));

/**
 * POST /auth/forgot-password
 * Request password reset. Sends email if user exists; same response either way.
 */
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = forgotPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            next(toValidationError(parsed.error));
            return;
        }
        const result = await authService.requestPasswordReset(parsed.data.email);
        void logAccess({
            action: AuditAction.PASSWORD_RESET_REQUESTED,
            ip: req.ip ?? req.socket?.remoteAddress,
            userAgent: req.get('User-Agent'),
            requestId: (req as Request & { id?: string }).id,
            httpMethod: req.method,
            path: req.originalUrl,
            statusCode: 200,
            success: true,
            // NOTE: email is not stored to avoid leaking whether account exists
        });
        res.json(result);
    } catch (e) {
        next(e);
    }
});

/**
 * POST /auth/reset-password
 * Reset password with token from email link.
 */
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = resetPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            next(toValidationError(parsed.error));
            return;
        }
        const { token, newPassword } = parsed.data;
        const result = await authService.resetPassword(token, newPassword);
        void logAccess({
            action: AuditAction.PASSWORD_RESET_COMPLETED,
            ip: req.ip ?? req.socket?.remoteAddress,
            userAgent: req.get('User-Agent'),
            requestId: (req as Request & { id?: string }).id,
            httpMethod: req.method,
            path: req.originalUrl,
            statusCode: 200,
            success: true,
        });
        res.json(result);
    } catch (e) {
        next(e);
    }
});

export { router as authRouter };

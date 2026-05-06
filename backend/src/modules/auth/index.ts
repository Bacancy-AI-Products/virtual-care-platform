import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '../../../generated/prisma';
import { toValidationError } from '../../utils/validation';
import * as authService from './auth.service';
import {
    forgotPasswordSchema,
    loginSchema,
    resetPasswordSchema,
    signupSchema,
} from './auth.schemas';

const router = Router();

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
        const result = await authService.login(email, password);
        res.json(result);
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
        res.json(result);
    } catch (e) {
        next(e);
    }
});

export { router as authRouter };

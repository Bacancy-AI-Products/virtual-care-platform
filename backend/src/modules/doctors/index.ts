import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware';
import { toValidationError } from '../../utils/validation';
import * as doctorsService from './doctors.service';
import {
    availabilityQuerySchema,
    doctorIdParamSchema,
    listDoctorsQuerySchema,
    updateDoctorProfileSchema,
} from './doctors.schemas';

const router = Router();

/**
 * GET /doctors/me
 * Get own doctor profile. Doctor-only. Must be defined before /:id.
 */
router.get(
    '/me',
    requireAuth,
    requireRole('DOCTOR'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as AuthenticatedRequest).user!.sub;
            const result = await doctorsService.getMyProfile(userId);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * PUT /doctors/me
 * Update own doctor profile. Doctor-only.
 */
router.put(
    '/me',
    requireAuth,
    requireRole('DOCTOR'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = updateDoctorProfileSchema.safeParse(req.body);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const userId = (req as AuthenticatedRequest).user!.sub;
            const result = await doctorsService.updateMyProfile(userId, parsed.data);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /doctors/me/stats
 * Get own aggregated trust-signal stats (rating, reviews, consultations, avg response).
 * Doctor-only. Split from /doctors/me so the main profile fetch stays a single DB query.
 */
router.get(
    '/me/stats',
    requireAuth,
    requireRole('DOCTOR'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as AuthenticatedRequest).user!.sub;
            const result = await doctorsService.getMyStats(userId);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /doctors/me/availability
 * Get own weekly availability. Doctor-only.
 */
router.get(
    '/me/availability',
    requireAuth,
    requireRole('DOCTOR'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as AuthenticatedRequest).user!.sub;
            const result = await doctorsService.getMyAvailability(userId);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * PUT /doctors/me/availability
 * Replace own weekly availability. Doctor-only.
 */
router.put(
    '/me/availability',
    requireAuth,
    requireRole('DOCTOR'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as AuthenticatedRequest).user!.sub;
            const result = await doctorsService.updateMyAvailability(userId, req.body);
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /doctors
 * List doctors with optional filters (specialization, verified) and pagination.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = listDoctorsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            next(toValidationError(parsed.error));
            return;
        }
        const result = await doctorsService.listDoctors(parsed.data);
        res.json(result);
    } catch (e) {
        next(e);
    }
});

/**
 * GET /doctors/specializations
 * Public list of all available specializations.
 */
router.get('/specializations', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await doctorsService.listSpecializations();
        res.json({ data: result });
    } catch (e) {
        next(e);
    }
});

/**
 * GET /doctors/:id
 * Get doctor public profile by ID.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = doctorIdParamSchema.safeParse(req.params);
        if (!parsed.success) {
            next(toValidationError(parsed.error));
            return;
        }
        const result = await doctorsService.getDoctorById(parsed.data.id);
        res.json(result);
    } catch (e) {
        next(e);
    }
});

/**
 * GET /doctors/:id/availability
 * Get doctor's weekly availability.
 */
router.get('/:id/availability', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const paramParsed = doctorIdParamSchema.safeParse(req.params);
        if (!paramParsed.success) {
            next(toValidationError(paramParsed.error));
            return;
        }

        const queryParsed = availabilityQuerySchema.safeParse(req.query);
        if (!queryParsed.success) {
            next(toValidationError(queryParsed.error));
            return;
        }

        const result = await doctorsService.getAvailability(paramParsed.data.id, queryParsed.data);
        res.json(result);
    } catch (e) {
        next(e);
    }
});

export { router as doctorsRouter };

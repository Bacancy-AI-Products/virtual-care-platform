import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware';
import { toValidationError } from '../../utils/validation';
import * as reviewsService from './reviews.service';
import {
    appointmentIdParamSchema,
    createReviewSchema,
    doctorIdParamSchema,
    listReviewsQuerySchema,
} from './reviews.schemas';

const router = Router();

/**
 * GET /reviews/mine
 * Patient-only — every review the caller has submitted. Powers the patient
 * feedback hub.
 */
router.get(
    '/reviews/mine',
    requireAuth,
    requireRole('PATIENT'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const queryParsed = listReviewsQuerySchema.safeParse(req.query);
            if (!queryParsed.success) {
                next(toValidationError(queryParsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            const result = await reviewsService.listReviewsByPatientUserId(user!.sub, {
                page: queryParsed.data.page,
                limit: queryParsed.data.limit,
            });
            res.json(result);
        } catch (e) {
            next(e);
        }
    },
);

/**
 * GET /doctors/:id/reviews
 * Public — patient-facing reviews list for a doctor + aggregate summary.
 */
router.get('/doctors/:id/reviews', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const paramParsed = doctorIdParamSchema.safeParse(req.params);
        if (!paramParsed.success) {
            next(toValidationError(paramParsed.error));
            return;
        }
        const queryParsed = listReviewsQuerySchema.safeParse(req.query);
        if (!queryParsed.success) {
            next(toValidationError(queryParsed.error));
            return;
        }
        const result = await reviewsService.listDoctorReviews({
            doctorId: paramParsed.data.id,
            page: queryParsed.data.page,
            limit: queryParsed.data.limit,
        });
        res.json(result);
    } catch (e) {
        next(e);
    }
});

/**
 * GET /appointments/:appointmentId/review
 * Caller-only — fetches the review for that completed appointment, if any.
 * Used by the UI to decide between "Write a review" and "View your review".
 */
router.get(
    '/appointments/:appointmentId/review',
    requireAuth,
    requireRole('PATIENT'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = appointmentIdParamSchema.safeParse(req.params);
            if (!parsed.success) {
                next(toValidationError(parsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            const review = await reviewsService.getReviewForAppointmentByPatient(
                parsed.data.appointmentId,
                user!.sub,
            );
            res.json({ data: review });
        } catch (e) {
            next(e);
        }
    },
);

/**
 * POST /appointments/:appointmentId/review
 * Patient submits a review for a completed appointment. One review per appointment.
 */
router.post(
    '/appointments/:appointmentId/review',
    requireAuth,
    requireRole('PATIENT'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const paramParsed = appointmentIdParamSchema.safeParse(req.params);
            if (!paramParsed.success) {
                next(toValidationError(paramParsed.error));
                return;
            }
            const bodyParsed = createReviewSchema.safeParse(req.body);
            if (!bodyParsed.success) {
                next(toValidationError(bodyParsed.error));
                return;
            }
            const { user } = req as AuthenticatedRequest;
            const review = await reviewsService.createReviewForAppointment(
                paramParsed.data.appointmentId,
                user!.sub,
                bodyParsed.data,
            );
            res.status(201).json(review);
        } catch (e) {
            next(e);
        }
    },
);

export { router as reviewsRouter };
